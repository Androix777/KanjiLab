import json
import sqlite3

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
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS test_freq (
            freq_id INTEGER,
            word TEXT,
            value INTEGER,
            PRIMARY KEY (freq_id)
        );
    ''')
    conn.commit()

def insert_data(conn, data):
    cursor = conn.cursor()

    for item in data:
        cursor.execute('INSERT OR IGNORE INTO word (word) VALUES (?)', (item['text'],))
        cursor.execute('SELECT id FROM word WHERE word = ?', (item['text'],))
        word_id = cursor.fetchone()[0]

        cursor.execute('INSERT INTO word_reading (word_id, word_reading) VALUES (?, ?)', (word_id, item['reading']))
        reading_id = cursor.lastrowid

        for fur in item['furigana']:
            rt = fur.get('rt', '')
            cursor.execute('INSERT OR IGNORE INTO word_part_reading (word_part, word_part_reading) VALUES (?, ?)', (fur['ruby'], rt))
            cursor.execute('SELECT id FROM word_part_reading WHERE word_part = ? AND word_part_reading = ?', (fur['ruby'], rt))
            furigana_id = cursor.fetchone()[0]

            cursor.execute('INSERT OR IGNORE INTO word_reading_word_part_reading (word_reading_id, word_part_reading_id) VALUES (?, ?)', 
                           (reading_id, furigana_id))
    
    conn.commit()

def insert_freq_data(conn, data):
    cursor = conn.cursor()

    for item in data:
        
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
        
        #cursor.execute('INSERT OR IGNORE INTO test_freq (word, value) VALUES (?, ?)', (item[0], item[2]['value'] if 'value' in item[2] else item[2]['frequency']['value']))

    conn.commit()

def main():
    data = load_json('./dbscripts/data/JmdictFurigana.json')
    conn = sqlite3.connect('./dbscripts/data/words.db')
    create_tables(conn)
    insert_data(conn, data)
    print('data 1 inserted')
    data2 = load_json('./dbscripts/data/term_meta_bank_1.json')
    insert_freq_data(conn, data2)
    conn.close()

if __name__ == "__main__":
    import os
    os.remove("./dbscripts/data/words.db")
    main()
    
