import json
import sqlite3
import xml.etree.ElementTree as ET
from tqdm import tqdm

def load_xml(file_path):
    tree = ET.parse(file_path)
    return tree.getroot()

def load_json(file_path):
    with open(file_path, 'r', encoding='utf-8-sig') as file:
        return json.load(file)

def create_tables(conn):
    cursor = conn.cursor()
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS word (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            word TEXT UNIQUE,
            frequency INTEGER
        );
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS word_reading (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            word_id INTEGER,
            word_reading TEXT,
            FOREIGN KEY(word_id) REFERENCES words(id)
        );
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS word_part_reading (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            word_part TEXT,
            word_part_reading TEXT,
            UNIQUE (word_part, word_part_reading)
        );
    ''')
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS word_reading_word_part_reading (
            word_reading_id INTEGER,
            word_part_reading_id INTEGER,
            FOREIGN KEY(word_reading_id) REFERENCES word_reading(id),
            FOREIGN KEY(word_part_reading_id) REFERENCES word_part_reading(id),
            PRIMARY KEY (word_reading_id, word_part_reading_id)
        );
    ''')
    conn.commit()

def insert_jmdict_data(conn, data):
    cursor = conn.cursor()

    for entry in tqdm(data.findall('entry'), desc="Inserting word data"):
        for keb in entry.findall('k_ele/keb'):
            cursor.execute('INSERT OR IGNORE INTO word (word) VALUES (?)', (keb.text,))
            cursor.execute('SELECT id FROM word WHERE word = ?', (keb.text,))
            word_id = cursor.fetchone()[0]

            for r_ele in entry.findall('r_ele'):
                reb = r_ele.find('reb')
                if reb is None:
                    continue

                re_nokanji = r_ele.find('re_nokanji')
                if re_nokanji is not None and len(entry.findall('r_ele')) > 1:
                    continue

                re_restr = r_ele.findall('re_restr')
                if re_restr:
                    if keb.text not in [restr.text for restr in re_restr]:
                        continue

                cursor.execute('INSERT INTO word_reading (word_id, word_reading) VALUES (?, ?)', (word_id, reb.text))

    conn.commit()

def insert_furigana_data(conn, data):
    cursor = conn.cursor()

    cursor.execute('SELECT id, word FROM word')
    words = {word: word_id for word_id, word in cursor.fetchall()}

    cursor.execute('SELECT id, word_id, word_reading FROM word_reading')
    readings = {(word_id, reading): reading_id for reading_id, word_id, reading in cursor.fetchall()}

    word_part_readings = set()
    word_reading_word_part_readings = []

    for item in tqdm(data, desc="Preparing jmdict data"):
        word_id = words.get(item['text'])
        if word_id is None:
            continue

        reading_id = readings.get((word_id, item['reading']))
        if reading_id is None:
            continue

        for fur in item['furigana']:
            rt = fur.get('rt', '')
            word_part_readings.add((fur['ruby'], rt))
            word_reading_word_part_readings.append((reading_id, fur['ruby'], rt))

    cursor.executemany('INSERT OR IGNORE INTO word_part_reading (word_part, word_part_reading) VALUES (?, ?)',
                       list(word_part_readings))

    cursor.execute('SELECT id, word_part, word_part_reading FROM word_part_reading')
    furiganas = {(word_part, reading): furigana_id for furigana_id, word_part, reading in cursor.fetchall()}

    word_reading_word_part_reading_data = [
        (reading_id, furiganas[(word_part, word_part_reading)])
        for reading_id, word_part, word_part_reading in word_reading_word_part_readings
        if (word_part, word_part_reading) in furiganas
    ]

    cursor.executemany('INSERT OR IGNORE INTO word_reading_word_part_reading (word_reading_id, word_part_reading_id) VALUES (?, ?)',
                       word_reading_word_part_reading_data)

    conn.commit()

def insert_freq_data(conn, data):
    cursor = conn.cursor()

    for item in tqdm(data, desc="Inserting frequency data"):
        
        if "㋕" in str(item):
            continue
        
        cursor.execute('SELECT word, frequency FROM word WHERE word = ?', (item[0],))
        result = cursor.fetchone()
        if not result:
            continue
        word, frequency = result
        
        new_frequency = (item[2]['value'] if 'value' in item[2] else item[2]['frequency']['value'])

        if frequency == None or frequency > new_frequency:
            cursor.execute('UPDATE word SET frequency = ? WHERE word = ?', (new_frequency, word))

    conn.commit()

def main():
    xml_data = load_xml('./dbscripts/data/JMdict.xml')
    furigana_data = load_json('./dbscripts/data/JmdictFurigana.json')
    freq_data = load_json('./dbscripts/data/term_meta_bank_1.json')

    conn = sqlite3.connect('./dbscripts/data/words.db')

    create_tables(conn)

    insert_jmdict_data(conn, xml_data)
    insert_furigana_data(conn, furigana_data)
    insert_freq_data(conn, freq_data)

    conn.close()

if __name__ == "__main__":
    import os

    if os.path.isfile("./dbscripts/data/words.db"):
        os.remove("./dbscripts/data/words.db")
    main()