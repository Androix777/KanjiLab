import json
import sqlite3
import xml.etree.ElementTree as ET

import regex as re
import wanakana
from tqdm import tqdm

KANJI_PATTERN = re.compile(r"[\p{Han}\u32FF\u337B-\u337F\u33E0-\u33FE]", re.UNICODE)


def load_xml(file_path):
    tree = ET.parse(file_path)
    return tree.getroot()


def load_json(file_path):
    with open(file_path, encoding="utf-8-sig") as file:
        return json.load(file)


def create_tables(conn):
    cursor = conn.cursor()

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS dictionary (
            id INTEGER PRIMARY KEY NOT NULL,
            name TEXT UNIQUE NOT NULL
        );
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS font (
            id INTEGER PRIMARY KEY NOT NULL,
            name TEXT UNIQUE NOT NULL
        );
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS word (
            id INTEGER PRIMARY KEY NOT NULL,
            word TEXT UNIQUE NOT NULL,
            frequency INTEGER,
            dictionary_id INTEGER NOT NULL,
            meanings TEXT NOT NULL,
            FOREIGN KEY(dictionary_id) REFERENCES dictionary(id)
        );
    """)

    cursor.execute("""
		CREATE UNIQUE INDEX IF NOT EXISTS idx_word_1 ON word (word, dictionary_id);
	""")

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS word_reading (
            id INTEGER PRIMARY KEY NOT NULL,
            word_id INTEGER NOT NULL,
            word_reading TEXT NOT NULL,
            FOREIGN KEY(word_id) REFERENCES word(id)
        );
    """)

    cursor.execute("""
        CREATE UNIQUE INDEX IF NOT EXISTS idx_word_reading_1 
                   ON word_reading (word_id, word_reading);
    """)

    cursor.execute("""
        CREATE INDEX idx_word_reading_2 ON word_reading (word_id);
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS word_part_reading (
            id INTEGER PRIMARY KEY NOT NULL,
            word_part TEXT NOT NULL,
            word_part_reading TEXT NOT NULL,
            UNIQUE (word_part, word_part_reading)
        );
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS word_reading_word_part_reading (
            word_reading_id INTEGER NOT NULL,
            word_part_reading_id INTEGER NOT NULL,
            FOREIGN KEY(word_reading_id) REFERENCES word_reading(id),
            FOREIGN KEY(word_part_reading_id) REFERENCES word_part_reading(id),
            PRIMARY KEY (word_reading_id, word_part_reading_id)
        );
    """)

    cursor.execute("""
        CREATE INDEX idx_word_reading_word_part_reading_1 
                   ON word_reading_word_part_reading (word_part_reading_id);
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS user (
            id INTEGER PRIMARY KEY NOT NULL,
            key TEXT UNIQUE NOT NULL
        );
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS answer_stats (
            id INTEGER PRIMARY KEY NOT NULL,
            game_stats_id INTEGER NOT NULL,
			user_id INTEGER NOT NULL,
            word TEXT NOT NULL,
            word_reading TEXT NOT NULL,
            duration INTEGER,
            is_correct INTEGER NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
            font_id INTEGER NOT NULL,
            FOREIGN KEY(game_stats_id) REFERENCES game_stats(id),
            FOREIGN KEY(font_id) REFERENCES font(id),
			FOREIGN KEY(user_id) REFERENCES user(id)
        );
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS game_stats (
            id INTEGER PRIMARY KEY NOT NULL,
            rounds_count INTEGER NOT NULL,
            round_duration INTEGER NOT NULL,
            min_frequency INTEGER NOT NULL,
            max_frequency INTEGER,
            font_id INTEGER,
            dictionary_id INTEGER NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
            FOREIGN KEY(font_id) REFERENCES font(id)
        );
    """)

    conn.commit()


def insert_jmdict_data(conn, data, jmdict_id):
    cursor = conn.cursor()

    GLOSS_SEPARATOR = "␞"
    SENSE_SEPARATOR = "␝"
    KEB_SEPARATOR = "␟"

    for entry in tqdm(data.findall("entry"), desc="Inserting word data"):
        keb_meanings = {}

        for sense in entry.findall("sense"):
            glosses = [gloss.text for gloss in sense.findall("gloss")]
            sense_meaning = GLOSS_SEPARATOR.join(glosses)

            for keb in entry.findall("k_ele/keb"):
                if not KANJI_PATTERN.search(keb.text):
                    continue

                if keb.text not in keb_meanings:
                    keb_meanings[keb.text] = []
                keb_meanings[keb.text].append(sense_meaning)

        for keb, meanings in keb_meanings.items():
            meanings_string = SENSE_SEPARATOR.join(meanings)

            cursor.execute("SELECT id, meanings FROM word WHERE word = ?", (keb,))
            result = cursor.fetchone()

            if result:
                word_id, existing_meanings = result
                if existing_meanings:
                    meanings_string = (
                        existing_meanings + KEB_SEPARATOR + meanings_string
                    )
                cursor.execute(
                    "UPDATE word SET meanings = ? WHERE id = ?",
                    (meanings_string, word_id),
                )
            else:
                cursor.execute(
                    "INSERT INTO word (word, dictionary_id, meanings) VALUES (?, ?, ?)",
                    (keb, jmdict_id, meanings_string),
                )
                word_id = cursor.lastrowid

            for r_ele in entry.findall("r_ele"):
                reb = r_ele.find("reb")
                if reb is None:
                    continue

                re_restr = r_ele.findall("re_restr")
                if re_restr and (keb not in [restr.text for restr in re_restr]):
                    continue
                try:
                    reading_hiragana = wanakana.to_hiragana(reb.text)
                    cursor.execute(
                        """INSERT OR IGNORE INTO 
                        word_reading (word_id, word_reading) VALUES (?, ?)""",
                        (word_id, reading_hiragana),
                    )
                except Exception:
                    print(reb.text)

    conn.commit()


def insert_furigana_data(conn, data):
    cursor = conn.cursor()

    cursor.execute("SELECT id, word FROM word")
    words = {word: word_id for word_id, word in cursor.fetchall()}

    cursor.execute("SELECT id, word_id, word_reading FROM word_reading")
    readings = {
        (word_id, reading): reading_id
        for reading_id, word_id, reading in cursor.fetchall()
    }

    word_part_readings = set()
    word_reading_word_part_readings = []
    reading_uuid_set = set()

    for item in tqdm(data, desc="Preparing furigana data"):
        word_uuid = words.get(item["text"])
        if word_uuid is None:
            continue

        reading_hiragana = wanakana.to_hiragana(item["reading"])

        reading_uuid = readings.get((word_uuid, reading_hiragana))
        if reading_uuid is None or reading_uuid in reading_uuid_set:
            continue

        for fur in item["furigana"]:
            rt = fur.get("rt", "")
            ruby = wanakana.to_hiragana(fur["ruby"])
            if rt != "":
                word_part_readings.add((ruby, rt))
                word_reading_word_part_readings.append((reading_uuid, ruby, rt))
                reading_uuid_set.add(reading_uuid)

    cursor.executemany(
        """INSERT OR IGNORE INTO word_part_reading 
        (word_part, word_part_reading) VALUES (?, ?)""",
        list(word_part_readings),
    )

    cursor.execute("SELECT id, word_part, word_part_reading FROM word_part_reading")
    furiganas = {
        (word_part, reading): furigana_id
        for furigana_id, word_part, reading in cursor.fetchall()
    }

    word_reading_word_part_reading_data = [
        (reading_uuid, furiganas[(word_part, word_part_reading)])
        for reading_uuid, word_part, word_part_reading in word_reading_word_part_readings
        if (word_part, word_part_reading) in furiganas
    ]

    cursor.executemany(
        """INSERT OR IGNORE INTO word_reading_word_part_reading 
        (word_reading_id, word_part_reading_id) VALUES (?, ?)""",
        word_reading_word_part_reading_data,
    )

    conn.commit()


def insert_freq_data(conn, data):
    cursor = conn.cursor()

    for item in tqdm(data, desc="Inserting frequency data"):
        if "㋕" in str(item):
            continue

        cursor.execute("SELECT word, frequency FROM word WHERE word = ?", (item[0],))
        result = cursor.fetchone()
        if not result:
            continue
        word, frequency = result

        new_frequency = (
            item[2]["value"] if "value" in item[2] else item[2]["frequency"]["value"]
        )

        if frequency is None or frequency > new_frequency:
            cursor.execute(
                "UPDATE word SET frequency = ? WHERE word = ?", (new_frequency, word)
            )

    conn.commit()


def main():
    xml_data = load_xml("./data/JMdict.xml")
    furigana_data = load_json("./data/JmdictFurigana.json")
    freq_data = load_json("./data/frequency.json")

    conn = sqlite3.connect("./data/words.db")

    create_tables(conn)

    cursor = conn.cursor()

    cursor.execute("INSERT OR IGNORE INTO dictionary (name) VALUES (?)", ("JMDict",))
    conn.commit()

    cursor.execute("SELECT id FROM dictionary WHERE name = ?", ("JMDict",))
    jmdict_id = cursor.fetchone()[0]

    insert_jmdict_data(conn, xml_data, jmdict_id)
    insert_furigana_data(conn, furigana_data)
    insert_freq_data(conn, freq_data)

    conn.close()


if __name__ == "__main__":
    import os

    if os.path.isfile("./data/words.db"):
        os.remove("./data/words.db")
    main()
