import json
import logging
import sqlite3
import xml.etree.ElementTree as ET
from abc import ABC, abstractmethod

import regex as re
import wanakana
from rich.console import Console
from rich.logging import RichHandler
from rich.progress import (
    BarColumn,
    MofNCompleteColumn,
    Progress,
    TextColumn,
    TimeElapsedColumn,
    TimeRemainingColumn,
)
from rich.text import Text

console = Console(color_system="auto")
logging.basicConfig(
    level="INFO",
    format="%(message)s",
    datefmt="[%X]",
    handlers=[RichHandler(console=console, rich_tracebacks=True, markup=True, show_path=False)],
)
log = logging.getLogger("rich_dict_importer")

RICH_PROGRESS_COLUMNS = [
    TextColumn("[progress.description]{task.description}"),
    BarColumn(bar_width=None),
    MofNCompleteColumn(),
    TextColumn("[progress.percentage]{task.percentage:>3.0f}%"),
    TimeRemainingColumn(),
    TimeElapsedColumn(),
]

class DatabaseManager:
    def __init__(self, db_path):
        self.db_path = db_path
        self.conn = None
        self.cursor = None

    def __enter__(self):
        self.conn = sqlite3.connect(self.db_path)
        self.cursor = self.conn.cursor()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.conn:
            if exc_type:
                log.error(f"Database transaction rolled back due to error: {exc_val}")
                self.conn.rollback()
            else:
                pass
            self.conn.close()

    def execute(self, sql, params=None):
        return self.cursor.execute(sql, params or ())

    def executemany(self, sql, params):
        return self.cursor.executemany(sql, params)

    def fetchone(self):
        return self.cursor.fetchone()

    def fetchall(self):
        return self.cursor.fetchall()

    def get_last_row_id(self):
        return self.cursor.lastrowid

    def commit(self):
        if self.conn:
            self.conn.commit()


class BaseDataProcessor(ABC):
    def __init__(self, db_manager: DatabaseManager, file_path: str):
        self.db_manager = db_manager
        self.file_path = file_path

    @abstractmethod
    def load_data(self):
        pass

    @abstractmethod
    def process_data(self):
        pass


class JmdictProcessor(BaseDataProcessor):
    GLOSS_SEPARATOR = "␞"
    SENSE_SEPARATOR = "␝"
    KEB_SEPARATOR = "␟"

    def __init__(self, db_manager: DatabaseManager, file_path: str, 
                 filter_tags: list[str] = None, exclude_tags: list[str] = None):
        super().__init__(db_manager, file_path)
        self.filter_tags = set(filter_tags) if filter_tags else set()
        self.exclude_tags = set(exclude_tags) if exclude_tags else set()
        
    def load_data(self):
        log.info(f"Loading JMDict data from [cyan]{self.file_path}[/cyan]...")
        tree = ET.parse(self.file_path)
        self.data = tree.getroot()
        log.info(Text("JMDict data loaded successfully.", style="green"))

    def _process_entry(self, entry):
        KANJI_PATTERN = re.compile(r"[\p{Han}\u32FF\u337B-\u337F\u33E0-\u33FE]", re.UNICODE)
        keb_meanings = {}

        for sense in entry.findall("sense"):
            glosses = [gloss.text for gloss in sense.findall("gloss") if gloss.text]
            if not glosses:
                continue
            sense_meaning = self.GLOSS_SEPARATOR.join(glosses)


            applies_to_kebs = [k.text for k in sense.findall("stagk")]
            
            target_keb_elements = []
            if not applies_to_kebs:
                target_keb_elements = entry.findall("k_ele/keb")
            else:
                for k_ele in entry.findall("k_ele"):
                    keb_text_element = k_ele.find("keb")
                    if keb_text_element is not None and keb_text_element.text in applies_to_kebs:
                        target_keb_elements.append(keb_text_element)
            
            for keb_element in target_keb_elements:
                keb_text = keb_element.text
                if not keb_text or not KANJI_PATTERN.search(keb_text):
                    continue
                keb_meanings.setdefault(keb_text, []).append(sense_meaning)

        word_ids_created_this_entry = {}

        for keb, meanings in keb_meanings.items():
            meanings_string = self.SENSE_SEPARATOR.join(meanings)
            word_id = None

            self.db_manager.execute("SELECT id, meanings FROM word WHERE word = ?", (keb,))
            result = self.db_manager.fetchone()

            if result:
                word_id, existing_meanings = result
                updated_meanings = existing_meanings or ""
                current_entry_meaning_block = meanings_string 
            
                if not any(block == current_entry_meaning_block for block in (existing_meanings or "").split(self.KEB_SEPARATOR)):
                    if updated_meanings:
                       updated_meanings += self.KEB_SEPARATOR
                    updated_meanings += current_entry_meaning_block

                if updated_meanings != (existing_meanings or ""):
                    self.db_manager.execute(
                        "UPDATE word SET meanings = ? WHERE id = ?",
                        (updated_meanings, word_id),
                    )
            else:
                self.db_manager.execute(
                    "INSERT INTO word (word, meanings) VALUES (?, ?)",
                    (keb, meanings_string),
                )
                word_id = self.db_manager.get_last_row_id()

            if word_id:
                 word_ids_created_this_entry[keb] = word_id

        for r_ele in entry.findall("r_ele"):
            reb_element = r_ele.find("reb")
            if reb_element is None or not reb_element.text:
                continue

            reading_original = reb_element.text
            reading_hiragana = None

            try:
                reading_hiragana = wanakana.to_hiragana(reading_original)
            except KeyError as e:
                log.warning(f"Wanakana KeyError on '[yellow]{reading_original}[/yellow]': {e}. Skipping reading.")
                continue
            except Exception as e:
                log.warning(f"Wanakana general error on '[yellow]{reading_original}[/yellow]': {e}. Skipping reading.")
                continue

            if reading_hiragana is None:
                continue

            re_restr_elements = r_ele.findall("re_restr")
            
            target_word_ids = []
            if not re_restr_elements:
                for keb_text_iter, w_id_iter in word_ids_created_this_entry.items():
                    sense_restrictions_for_reading = [s.text for s in r_ele.findall("re_stagk")]
                    if not sense_restrictions_for_reading or keb_text_iter in sense_restrictions_for_reading:
                         target_word_ids.append(w_id_iter)

            else:
                for restr_element in re_restr_elements:
                    restr_text = restr_element.text
                    w_id = word_ids_created_this_entry.get(restr_text)
                    if w_id:
                        target_word_ids.append(w_id)
            
            for w_id in set(target_word_ids):
                try:
                    self.db_manager.execute(
                        "INSERT OR IGNORE INTO word_reading (word_id, word_reading) VALUES (?, ?)",
                        (w_id, reading_hiragana),
                    )
                except sqlite3.Error as db_err:
                    log.error(f"DB error for reading '[yellow]{reading_hiragana}[/yellow]' (orig: '[yellow]{reading_original}[/yellow]'), word_id [bold]{w_id}[/bold]: {db_err}")


    def _should_process_entry(self, entry) -> bool:
        if not self.filter_tags and not self.exclude_tags:
            return True
        
        entry_tags = set()
        
        for sense in entry.findall("sense"):
            for misc in sense.findall("misc"):
                if misc.text:
                    entry_tags.add(misc.text)
            
            for pos in sense.findall("pos"):
                if pos.text:
                    entry_tags.add(pos.text)
        
        for k_ele in entry.findall("k_ele"):
            for ke_info in k_ele.findall("ke_inf"):
                if ke_info.text:
                    entry_tags.add(ke_info.text)
        
        for r_ele in entry.findall("r_ele"):
            for re_info in r_ele.findall("re_inf"):
                if re_info.text:
                    entry_tags.add(re_info.text)

        if self.exclude_tags and entry_tags.intersection(self.exclude_tags):
            return False
        
        if self.filter_tags:
            return bool(entry_tags.intersection(self.filter_tags))
        
        return True


    def process_data(self):
        log.info("Processing JMDict data...")
        entries = self.data.findall("entry")
        
        if self.filter_tags:
            log.info(f"Filtering entries with tags: {', '.join(self.filter_tags)}")
        if self.exclude_tags:
            log.info(f"Excluding entries with tags: {', '.join(self.exclude_tags)}")
        
        processed_count = 0
        with Progress(*RICH_PROGRESS_COLUMNS, console=console, transient=True) as progress:
            task = progress.add_task("[green]Parsing JMDict entries...", total=len(entries))
            for entry in entries:
                if self._should_process_entry(entry):
                    self._process_entry(entry)
                    processed_count += 1
                progress.update(task, advance=1)
        
        log.info(f"JMDict data processed. {processed_count}/{len(entries)} entries processed.")



class FuriganaProcessor(BaseDataProcessor):
    def __init__(self, db_manager: DatabaseManager, file_path: str):
        super().__init__(db_manager, file_path)
        self.file_path = file_path
        self.data = None

    def load_data(self):
        log.info(f"Loading Furigana data from [cyan]{self.file_path}[/cyan]...")
        with open(self.file_path, encoding="utf-8-sig") as file:
            self.data = json.load(file)
        log.info(Text("Furigana data loaded successfully.", style="green"))

    def process_data(self):
        if not self.data:
            log.error("Furigana data not loaded. Call load_data() first.")
            return
        log.info("Processing Furigana data...")

        self.db_manager.execute("SELECT id, word FROM word")
        words_map = {word: word_id for word_id, word in self.db_manager.fetchall()}

        self.db_manager.execute("SELECT id, word_id, word_reading FROM word_reading")
        readings_map = {
            (word_id, reading): reading_id
            for reading_id, word_id, reading in self.db_manager.fetchall()
        }

        word_part_readings_to_insert = set()
        raw_word_reading_links = []
        processed_reading_db_ids = set()

        with Progress(*RICH_PROGRESS_COLUMNS, console=console, transient=True) as progress_bar:
            task = progress_bar.add_task("[cyan]Preparing furigana data (Phase 1/2)...", total=len(self.data))
            for item in self.data:
                word_db_id = words_map.get(item["text"])
                if word_db_id is None:
                    progress_bar.update(task, advance=1)
                    continue

                try:
                    reading_hiragana = wanakana.to_hiragana(item["reading"])
                except Exception as e:
                    log.warning(f"Wanakana error converting reading '{item['reading']}' for word '{item['text']}': {e}. Skipping item.")
                    progress_bar.update(task, advance=1)
                    continue
                
                reading_db_id = readings_map.get((word_db_id, reading_hiragana))

                if reading_db_id is None:
                    progress_bar.update(task, advance=1)
                    continue
                
                if reading_db_id in processed_reading_db_ids:
                    progress_bar.update(task, advance=1)
                    continue

                added_furigana_for_current_reading = False
                for fur_segment in item["furigana"]:
                    ruby_base_text_rt = fur_segment.get("ruby")
                    ruby_text_reading_rt = fur_segment.get("rt")

                    if not ruby_base_text_rt or not ruby_text_reading_rt:
                        continue
                    
                    try:
                        hiragana_ruby_text_reading = wanakana.to_hiragana(ruby_text_reading_rt)
                    except Exception as e:
                        log.warning(f"Wanakana error converting furigana rt '{ruby_text_reading_rt}' for ruby '{ruby_base_text_rt}': {e}. Skipping segment.")
                        continue
                    
                    word_part_readings_to_insert.add((ruby_base_text_rt, hiragana_ruby_text_reading))
                    raw_word_reading_links.append((reading_db_id, ruby_base_text_rt, hiragana_ruby_text_reading))
                    added_furigana_for_current_reading = True
                
                if added_furigana_for_current_reading:
                    processed_reading_db_ids.add(reading_db_id)
                progress_bar.update(task, advance=1)

        if word_part_readings_to_insert:
            self.db_manager.executemany(
                "INSERT OR IGNORE INTO word_part_reading (word_part, word_part_reading) VALUES (?, ?)",
                list(word_part_readings_to_insert),
            )
            log.info(f"Prepared {len(word_part_readings_to_insert)} unique word part readings for DB insertion.")


        self.db_manager.execute("SELECT id, word_part, word_part_reading FROM word_part_reading")
        furigana_parts_map = {
            (wp, wpr): f_id
            for f_id, wp, wpr in self.db_manager.fetchall()
        }

        final_links_to_insert_tuples = []
        with Progress(*RICH_PROGRESS_COLUMNS, console=console, transient=True) as progress_bar:
            task = progress_bar.add_task("[cyan]Linking furigana parts (Phase 2/2)...", total=len(raw_word_reading_links))
            for r_db_id, rt_text, ruby_read_text in raw_word_reading_links:
                furigana_part_id = furigana_parts_map.get((rt_text, ruby_read_text))
                if furigana_part_id:
                    final_links_to_insert_tuples.append((r_db_id, furigana_part_id))
                progress_bar.update(task, advance=1)

        if final_links_to_insert_tuples:
            self.db_manager.executemany(
                "INSERT OR IGNORE INTO word_reading_word_part_reading (word_reading_id, word_part_reading_id) VALUES (?, ?)",
                final_links_to_insert_tuples,
            )
            log.info(f"Prepared {len(final_links_to_insert_tuples)} furigana links for DB insertion.")

        log.info(Text("Furigana data processing complete.", style="green"))


class FrequencyProcessor(BaseDataProcessor):
    def __init__(self, db_manager: DatabaseManager, file_path: str):
        super().__init__(db_manager, file_path)
        self.file_path = file_path
        self.data = None

    def load_data(self):
        log.info(f"Loading Frequency data from [cyan]{self.file_path}[/cyan]...")
        with open(self.file_path, encoding="utf-8") as file:
            self.data = json.load(file)
        log.info(Text("Frequency data loaded successfully.", style="green"))

    def process_data(self):
        if not self.data:
            log.error("Frequency data not loaded. Call load_data() first.")
            return
        log.info("Processing Frequency data...")

        updates_to_perform = []
        with Progress(*RICH_PROGRESS_COLUMNS, console=console, transient=True) as progress_bar:
            task = progress_bar.add_task("[cyan]Preparing frequency data...", total=len(self.data))
            for item in self.data:
                word_form = item[0]
                freq_data_obj = item[2]

                if "㋕" in str(freq_data_obj):
                    progress_bar.update(task, advance=1)
                    continue

                freq_value_source = item[2]
                new_frequency = None
                if isinstance(freq_value_source, dict):
                    if "value" in freq_value_source:
                        new_frequency = freq_value_source["value"]
                    elif "frequency" in freq_value_source and isinstance(freq_value_source["frequency"], dict) and "value" in freq_value_source["frequency"]:
                         new_frequency = freq_value_source["frequency"]["value"]


                if new_frequency is None:
                    progress_bar.update(task, advance=1)
                    continue

                try:
                    new_frequency = int(new_frequency)
                except ValueError:
                    progress_bar.update(task, advance=1)
                    continue
                
                updates_to_perform.append((new_frequency, word_form))
                progress_bar.update(task, advance=1)
        
        if updates_to_perform:
            updated_count = 0
            with Progress(*RICH_PROGRESS_COLUMNS, console=console, transient=True) as progress_bar:
                task = progress_bar.add_task("[cyan]Applying frequency updates...", total=len(updates_to_perform))
                for new_freq, word in updates_to_perform:
                    self.db_manager.execute("SELECT frequency FROM word WHERE word = ?", (word,))
                    result = self.db_manager.fetchone()
                    if result:
                        current_frequency = result[0]
                        if current_frequency is None or new_freq < current_frequency :
                            self.db_manager.execute(
                                "UPDATE word SET frequency = ? WHERE word = ?", (new_freq, word)
                            )
                            updated_count +=1
                    progress_bar.update(task, advance=1)
            log.info(f"{updated_count} word frequencies updated in the database.")
        else:
            log.info("No frequency updates to perform.")

        log.info(Text("Frequency data processed.", style="green"))


class DictionaryBuilder:
    def __init__(self, db_path: str, dict_name: str, dict_guid: str, stats_config: dict = None):
        self.db_path = db_path
        self.dict_name = dict_name
        self.dict_guid = dict_guid
        self.stats_config = stats_config
        self.description = None
        self.processors = []

    def add_processor(self, processor_instance: BaseDataProcessor, stage_name: str):
        self.processors.append({
            "processor": processor_instance, 
            "name": stage_name
        })
        
    def _initialize_dictionary_info(self, db_manager: DatabaseManager):
        log.info(f"Initializing dictionary metadata for: [bold magenta]{self.dict_name}[/bold magenta] (GUID: {self.dict_guid})")
        try:
            import json
            stats_config_json = json.dumps(self.stats_config) if self.stats_config else None
            
            db_manager.execute(
                "INSERT OR IGNORE INTO dictionary_info (name, guid, stats_config, description) VALUES (?, ?, ?, ?)",
                (self.dict_name, self.dict_guid, stats_config_json, self.description),
            )

            db_manager.commit()
            log.info(Text("Dictionary metadata initialized/confirmed.", style="green"))
        except sqlite3.Error as e:
            log.error(f"Failed to initialize dictionary_info: {e}")
            raise

    def run(self):
        console.rule(f"[bold #2E8B57]🚀 Building Dictionary: {self.dict_name} 🚀[/bold #2E8B57]", style="#FFD700")

        with DatabaseManager(self.db_path) as db_manager:
            self._initialize_dictionary_info(db_manager)

            for idx, p_config in enumerate(self.processors):
                processor = p_config["processor"]
                stage_friendly_name = p_config["name"]
                
                processor.db_manager = db_manager

                console.rule(f"[bold #FFA500]STAGE {idx+1}: Processing {stage_friendly_name} Data[/bold #FFA500]", style="#4682B4")
                
                try:
                    processor.load_data()
                    processor.process_data()
                    db_manager.commit()
                    log.info(f"[bold #32CD32]✅ Stage {idx+1} ({stage_friendly_name}) completed. Data committed.[/bold #32CD32]")
                except Exception as e:
                    log.exception(f"[bold red]❌ Error during Stage {idx+1} ({stage_friendly_name}): {e}[/bold red]")
                    log.error(f"[bold red]Processing aborted for {stage_friendly_name}. Subsequent stages will be skipped.[/bold red]")
                    raise

        console.rule(f"[bold #32CD32]🎉 Dictionary Build Process Attempted for '{self.dict_name}' 🎉[/bold #32CD32]", style="#FFD700")
        log.info("Application finished. Check logs for details on each stage.")

def main():

    console.rule("[bold #2E8B57]🚀 Dictionary Data Processing Engine Initialized 🚀[/bold #2E8B57]", style="#FFD700")

    # Default stats configuration
    default_stats_config = {
        "frequencyValues": [1000, 2500, 5000, 10000, 20000, 30000, 50000, 100000],
        "medals": [
            {"value": 0, "color": "#gray", "points": 0},
            {"value": 5, "color": "#cd7f32", "points": 1},
            {"value": 15, "color": "#c0c0c0", "points": 2},
            {"value": 50, "color": "#ffd700", "points": 3},
            {"value": 100, "color": "#b9f2ff", "points": 5}
        ]
    }

    builder = DictionaryBuilder("./data/dict.db", "JMDict", "a5ecf9a5-7a0e-4858-8122-62365f3f8965", default_stats_config)
    builder.description = "JMDict dictionary"

    builder.add_processor(
        JmdictProcessor(
			db_manager=None,
			file_path="./data/JMdict.xml"), 
        "JMDict")
    
    builder.add_processor(
        FuriganaProcessor(
			db_manager=None,
			file_path="./data/JmdictFurigana.json"), 
        "JmdictFurigana")
    
    builder.add_processor(
		FrequencyProcessor(
			db_manager=None,
			file_path="./data/frequency.json"), 
		"Word Frequency")

    try:
        builder.run()
    except Exception:
        log.error("[bold red]The dictionary build process failed catastrophically. See errors above.[/bold red]")



if __name__ == "__main__":
    main()
