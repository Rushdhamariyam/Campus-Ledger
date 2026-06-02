import os

clubs = [
    ("ORSO", "club_orso.html", "ORSO.jpeg", "Open Source and Robotics Club"),
    ("TINKERHUB", "club_tinkerhub.html", "TINKERHUB.jpeg", "Innovation and Maker Community"),
    ("ASTHRA", "club_asthra.html", "ASTHRA.jpeg", "Technical Symposium"),
    ("ETHREAL", "club_ethreal.html", "ETHEREAL.jpeg", "Web3 and Blockchain Society"),
    ("D2R", "club_d2r.html", "D2R.jpeg", "Developer to Researcher Group"),
    ("AETHRA", "club_aethra.html", "AETHRA.jpeg", "Automotive Engineering"),
    ("FOSS CLUB", "club_foss.html", "FOSS.jpeg", "Free and Open Source Software")
]

template = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{name} - Campus Ledger</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="index.css">
    <link rel="stylesheet" href="club_page.css">
</head>
<body>
    <div class="background-orbs"><div class="orb orb-1"></div><div class="orb orb-2"></div><div class="orb orb-3"></div></div>
    
    <div class="club-container">
        <!-- Top Nav -->
        <nav class="top-nav glass-panel fade-in-up">
            <div class="nav-left"><h1 class="logo-small">CampusLedger</h1></div>
            <div class="nav-right" style="align-items: center;">
                <a href="student_dashboard.html" class="nav-link">Home</a>
                <a href="tickets.html" class="nav-link">Tickets</a>
                <button class="connect-btn" style="background: rgba(99, 102, 241, 0.15); border: 1px solid var(--accent-primary); padding: 0.45rem 1.25rem; border-radius: 20px; color: #fff; font-family: 'Outfit'; font-weight: 600; margin-left: 0.5rem; transition: all 0.3s ease;">Connect Wallet</button>
            </div>
        </nav>

        <header class="club-header glass-panel fade-in-up delay-1">
            <img src="{img}" alt="{name} Logo" class="club-hero-img">
            <div class="club-info">
                <h2>{name}</h2>
                <p class="club-desc">{desc}</p>
                <div class="club-stats">
                    <span class="stat-badge">⭐ Top Rated</span>
                    <span class="stat-badge">👥 150+ Members</span>
                </div>
            </div>
        </header>

        <div class="club-content fade-in-up delay-2">
            <section class="events-section glass-panel">
                <h3 class="section-title">Upcoming Club Events</h3>
                <div class="event-list">
                    <div class="event-row">
                        <div class="event-date">Oct 24</div>
                        <div class="event-name">Weekly Mentorship Program</div>
                        <div class="event-price">10 CTK</div>
                        <button class="btn-primary btn-small">Register</button>
                    </div>
                </div>
            </section>
            
            <section class="wallet-section glass-panel">
                <h3 class="section-title">{name} Treasury</h3>
                <p style="color: var(--text-secondary); margin-bottom: 1rem;">Send CTK directly to support the club.</p>
                <div class="qr-box">
                    <img src="assets/qr-placeholder.png" alt="Club QR" class="club-qr">
                    <p class="wallet-address" style="margin-top: 1rem; font-family: monospace; color: var(--accent-primary);">0x9E60...FBe7</p>
                </div>
            </section>
        </div>
    </div>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/ethers/5.7.2/ethers.umd.min.js" type="application/javascript"></script>
    <script src="script.js"></script>
</body>
</html>"""

for name, filename, img, desc in clubs:
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(template.format(name=name, img=img, desc=desc))
