import sqlite3

def init_db():
    print('Connecting to SQLite Database...')
    conn = sqlite3.connect('campus_ledger.db')
    c = conn.cursor()
    
    # Drop to cleanly recreate schema (Keep events for persistence)
    c.execute('DROP TABLE IF EXISTS students')
    c.execute('DROP TABLE IF EXISTS admins')
    # c.execute('DROP TABLE IF EXISTS events')
    
    c.execute('''CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        wallet_address TEXT NOT NULL
    )''')
    c.execute('''CREATE TABLE IF NOT EXISTS admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        club_name TEXT NOT NULL
    )''')
    c.execute('''CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        club_name TEXT NOT NULL,
        event_name TEXT NOT NULL,
        date TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        cost INTEGER NOT NULL,
        wallet_address TEXT NOT NULL
    )''')
    
    # Store the exact accounts requested
    c.execute("INSERT INTO students (username, password, wallet_address) VALUES ('rushdha', 'rushdha123', '0x2dF228A9E4F3D60ad292402C38BDb17d40a4Edd4')")
    c.execute("INSERT INTO admins (username, password, club_name) VALUES ('tinkerhub', 'tinkerhub123', 'TINKERHUB')")
    c.execute("INSERT INTO admins (username, password, club_name) VALUES ('asthra', 'asthra123', 'ASTHRA')")
    c.execute("INSERT INTO admins (username, password, club_name) VALUES ('orso', 'orso123', 'ORSO')")
    
    conn.commit()
    conn.close()
    print('Database initialized successfully with the requested accounts containing wallet addresses!')

if __name__ == '__main__':
    init_db()
