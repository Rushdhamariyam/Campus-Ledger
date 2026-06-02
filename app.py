from flask import Flask, request, jsonify, session, make_response
import sqlite3
import os

# Serve static files from the root directory so HTML/CSS paths stay exactly the same seamlessly
app = Flask(__name__, static_folder='.', static_url_path='')
app.secret_key = 'campus_ledger_ultra_secret_key'

# Disable static file caching for development
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0
@app.after_request
def add_header(response):
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, post-check=0, pre-check=0, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '-1'
    return response

def get_db_connection():
    conn = sqlite3.connect('campus_ledger.db')
    conn.row_factory = sqlite3.Row
    return conn

# ---- Static Routing Logic ----
@app.route('/')
def root():
    return app.send_static_file('index.html')

@app.route('/<path:path>')
def serve_static(path):
    return app.send_static_file(path)

# ---- Login API Handlers ----
@app.route('/api/login/student', methods=['POST'])
def login_student():
    session.clear()
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    conn = get_db_connection()
    student = conn.execute('SELECT * FROM students WHERE username = ? AND password = ?', (username, password)).fetchone()
    conn.close()
    
    if student:
        session['user_type'] = 'student'
        session['username'] = student['username']
        return jsonify({"success": True, "redirect": "student_dashboard.html"}), 200
    else:
        return jsonify({"success": False, "message": "Invalid student credentials"}), 401

@app.route('/api/login/admin', methods=['POST'])
def login_admin():
    session.clear()
    data = request.json
    username = data.get('username')
    password = data.get('password')
    
    conn = get_db_connection()
    admin = conn.execute('SELECT * FROM admins WHERE username = ? AND password = ?', (username, password)).fetchone()
    conn.close()
    
    if admin:
        session['user_type'] = 'admin'
        session['username'] = admin['username']
        session['club_name'] = admin['club_name']
        return jsonify({"success": True, "redirect": "admin_dashboard.html"}), 200
    else:
        return jsonify({"success": False, "message": "Invalid admin credentials"}), 401

@app.route('/api/user_info')
def user_info():
    if 'username' not in session:
        return jsonify({"success": False, "message": "Not logged in"}), 401
    
    conn = get_db_connection()
    if session.get('user_type') == 'student':
        user = conn.execute('SELECT * FROM students WHERE username = ?', (session['username'],)).fetchone()
        conn.close()
        if user:
            resp = make_response(jsonify({
                "success": True, 
                "username": user['username'], 
                "wallet_address": user['wallet_address'],
                "user_type": "student"
            }))
            resp.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
            return resp
    elif session.get('user_type') == 'admin':
        user = conn.execute('SELECT * FROM admins WHERE username = ?', (session['username'],)).fetchone()
        conn.close()
        if user:
            # Mapping club names to their respective treasury wallets as requested
            club_wallets = {
                "TINKERHUB": "0xdB49dca421e1d95B25819Ab633040A03FB0674Ad",
                "ORSO": "0x6E62AA14E0D7E81E641cb0F92777737A3D8E6481",
                "ASTHRA": "0x0ef04cB9A52995dC4e6beec5d40d45D41FCdd6f6"
            }
            wallet = club_wallets.get(user['club_name'].upper(), "0x0000000000000000000000000000000000000000")
            
            resp = make_response(jsonify({
                "success": True, 
                "username": user['username'], 
                "club_name": user['club_name'],
                "wallet_address": wallet,
                "user_type": "admin"
            }))
            resp.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
            return resp
            
    conn.close()
    return jsonify({"success": False, "message": "User not found"}), 404

@app.route('/api/events/add', methods=['POST'])
def add_event():
    if 'user_type' not in session or session['user_type'] != 'admin':
        return jsonify({"success": False, "message": "Unauthorized"}), 403
    
    data = request.json
    # Club name for display purposes (can be overridden)
    display_club_name = data.get('club_name') or session.get('club_name')
    event_name = data.get('event_name')
    date = data.get('date')
    start_time = data.get('start_time')
    end_time = data.get('end_time')
    cost = data.get('cost')

    # Mapping to get the internal wallet address for the poster's club
    club_wallets = {
        "TINKERHUB": "0xdB49dca421e1d95B25819Ab633040A03FB0674Ad",
        "ORSO": "0x6E62AA14E0D7E81E641cb0F92777737A3D8E6481",
        "ASTHRA": "0x0ef04cB9A52995dC4e6beec5d40d45D41FCdd6f6"
    }
    # Always use the treasury wallet of the logged-in admin's club
    admin_club = session.get('club_name', '').upper()
    wallet_address = club_wallets.get(admin_club, "0x0000000000000000000000000000000000000000")

    if not all([display_club_name, event_name, date, start_time, end_time, cost, wallet_address]):
        return jsonify({"success": False, "message": "Missing fields"}), 400

    conn = get_db_connection()
    conn.execute('INSERT INTO events (club_name, event_name, date, start_time, end_time, cost, wallet_address) VALUES (?, ?, ?, ?, ?, ?, ?)',
                 (display_club_name, event_name, date, start_time, end_time, cost, wallet_address))
    conn.commit()
    conn.close()
    
    return jsonify({"success": True})

@app.route('/api/events', methods=['GET'])
def get_events():
    conn = get_db_connection()
    events = conn.execute('SELECT * FROM events ORDER BY date ASC').fetchall()
    conn.close()
    
    # Mapping club names to their respective treasury wallets
    club_wallets = {
        "TINKERHUB": "0xdB49dca421e1d95B25819Ab633040A03FB0674Ad",
        "ORSO": "0x6E62AA14E0D7E81E641cb0F92777737A3D8E6481",
        "ASTHRA": "0x0ef04cB9A52995dC4e6beec5d40d45D41FCdd6f6"
    }
    
    events_list = []
    for row in events:
        event_dict = dict(row)
        # Inject wallet address for booking
        event_dict['wallet_address'] = club_wallets.get(event_dict['club_name'].upper(), "0x0000000000000000000000000000000000000000")
        events_list.append(event_dict)
        
    resp = make_response(jsonify({"success": True, "events": events_list}))
    resp.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    return resp

@app.route('/api/logout')
def logout():
    session.clear()
    return jsonify({"success": True, "redirect": "index.html"}), 200

if __name__ == '__main__':
    print("Starting Campus Ledger Flask Backend...")
    app.run(debug=True, port=5000)
