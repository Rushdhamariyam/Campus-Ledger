const contractAddress = "0x9E6027Cc4fD67EDFD0d8F5eA25e23afA7D67FBe7";
const contractABI = [
    "function name() view returns (string)",
    "function symbol() view returns (string)",
    "function balance(address) view returns (uint)",
    "function transfer(address to, uint amount, string memory purpose)",
    "function getTransactions() view returns (tuple(address from, address to, uint amount, string purpose, uint timestamp)[])",
    "event TokensSent(address from, address to, uint amount, string purpose, uint timestamp)"
];

let contract, wallet, provider, signer;
let loggedInUserType = "";
let dbWallet = "";

// Quietly check if MetaMask is already connected IF the user has already opted-in within this session
async function checkConnection() {
    if (window.ethereum) {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            // Only auto-connect if we have a session flag and accounts exist
            if (accounts.length > 0 && sessionStorage.getItem('walletConnected') === 'true') {
                wallet = accounts[0];
                await initializeEthers(true); // Flag as auto-reconnect
            }
        } catch (err) { console.error("Auto-connect error:", err); }
    }
}

async function connectWallet() {
    if (window.ethereum) {
        try {
            const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            wallet = accounts[0];
            sessionStorage.setItem('walletConnected', 'true'); // Persist for this tab/session
            await initializeEthers(false); // Flag as manual connect
        } catch (error) { console.error(error); alert("Error connecting wallet: " + error.message); }
    } else alert("MetaMask is not installed.");
}

async function initializeEthers(isAuto = false) {
    if (dbWallet && wallet.toLowerCase() !== dbWallet.toLowerCase()) {
        const typeLabel = loggedInUserType === 'admin' ? "Club Treasury" : "Student profile";
        
        // ONLY alert if the user explicitly clicked "Connect" and picked the wrong account
        if (!isAuto) {
            alert(`⚠️ MetaMask Account Mismatch!\n\nYou are logged in as a ${typeLabel} that owns:\n${dbWallet}\n\nBut you just connected:\n${wallet.toLowerCase()}\n\nPlease switch to the correct account in MetaMask.`);
        }
        
        // Visual indicator of mismatch
        const connectBtns = document.querySelectorAll('#connect-wallet-btn, .connect-btn');
        connectBtns.forEach(btn => {
            btn.innerText = "Switch Account";
            btn.style.background = "rgba(245, 158, 11, 0.2)"; // Amber/Orange
            btn.style.borderColor = "#f59e0b";
            btn.style.boxShadow = "0 0 10px rgba(245, 158, 11, 0.3)";
        });
        return;
    }
    
    // Update action globally and persistently
    const statusText = document.getElementById('wallet-status-text');
    const connectedInfo = document.getElementById('connected-info');
    const connectBtns = document.querySelectorAll('#connect-wallet-btn, .connect-btn');
    
    if(statusText) {
        statusText.innerText = "Connected via MetaMask";
        statusText.style.color = 'var(--accent-primary)';
    }
    if(connectedInfo) {
        connectedInfo.style.display = 'flex';
        const addressDisplay = connectedInfo.querySelector('.wallet-address');
        if(addressDisplay) addressDisplay.innerText = wallet.substring(0, 6) + '...' + wallet.substring(38);
    }
    
    connectBtns.forEach(btn => {
         btn.innerText = wallet.substring(0,6) + "..." + wallet.slice(-4);
         btn.style.background = "rgba(16, 185, 129, 0.2)"; // Green
         btn.style.borderColor = "#10b981";
         btn.style.boxShadow = "0 0 10px rgba(16, 185, 129, 0.3)";
    });

    provider = new ethers.providers.Web3Provider(window.ethereum);
    signer = provider.getSigner();
    contract = new ethers.Contract(contractAddress, contractABI, signer);
    
    // Core Real-Time Synchronizer: Listen for any tokens being sent on the chain
    contract.on("TokensSent", async () => {
        console.log("Live Blockchain Activity Detected - Refreshing UI...");
        await updateBalance();
        await loadTransactionHistory();
    });

    await updateBalance();
    await loadTransactionHistory();
}

async function updateBalance() {
    if (!contract) return;
    try {
        const clubWalletElement = document.querySelector('.wallet-address[data-full-address]');
        const clubWallet = clubWalletElement ? clubWalletElement.getAttribute('data-full-address').toLowerCase() : null;
        
        // Priority logic for balance: If admin, use club wallet. If student, use connected/db wallet.
        const targetWallet = (loggedInUserType === 'admin') ? (clubWallet || dbWallet) : (clubWallet || wallet || dbWallet);
        if (!targetWallet) return;

        const bal = await contract.balance(targetWallet);
        const balanceElements = document.querySelectorAll('.balance-amount');
        balanceElements.forEach(el => el.innerText = bal.toString() + " CTK");
    } catch (error) { console.error(error); }
}

async function sendTokens() {
    const to = document.getElementById("student-wallet")?.value.trim();
    const amount = document.getElementById("token-amount")?.value;
    const purpose = document.getElementById("purpose")?.value.trim();
    
    // Diagnostic Alert
    console.log("Transaction parameters:", { to, amount, purpose });
    
    if (!to || to === "undefined" || to === "null" || to.startsWith("0x0000")) {
        alert("❌ Error: Invalid recipient address. Please refresh the page and try again.");
        return;
    }
    
    if (!amount || isNaN(amount) || amount <= 0) {
        alert("Enter a valid token amount");
        return;
    }
    
    try {
        const submitBtn = document.querySelector('.send-btn');
        if(submitBtn) submitBtn.innerText = "Sending...";
        
        // Use BigNumber for the amount to ensure compatibility with contract uint256
        const amountBN = ethers.BigNumber.from(amount.toString());
        
        console.log("Executing transfer to:", to, "Amount:", amountBN.toString(), "Purpose:", purpose);
        
        const tx = await contract.transfer(to, amountBN, purpose, {
            gasLimit: 250000 // Increased from 100k to 250k to ensure complex logic (like string storage) doesn't run out of gas
        });
        await tx.wait(); 
        
        if(submitBtn) {
            submitBtn.innerText = "✅ Transaction successful!";
            submitBtn.style.background = "linear-gradient(135deg, #10b981, #059669)";
            
            // If we are on the tickets booking modal, close it after a brief success message
            const modal = document.getElementById("booking-modal");
            setTimeout(() => {
                if (modal) modal.style.display = "none";
                submitBtn.innerText = "Send Tokens";
                submitBtn.style.background = "";
                document.getElementById('send-token-form')?.reset();
            }, 2000);
        }
        
        await updateBalance();
        await loadTransactionHistory();
    } catch (error) {
        console.error("FULL ERROR OBJECT:", error);
        
        // Extract the most helpful error message
        const errorMessage = error.reason || error.message || "Unknown error";
        const detailedError = error.data?.message || "";
        
        alert(`❌ Transaction failed or rejected\n\nMain Error: ${errorMessage}\n\nDetail: ${detailedError}\n\nCheck browser console (F12) for full details.`);
        
        const submitBtn = document.querySelector('.send-btn');
        if(submitBtn) submitBtn.innerText = "Send Tokens";
    }
}

// Global Blockchain read functionality
async function loadTransactionHistory() {
    try {
        if (!window.ethereum) return;
        // Allows reading from contract even before clicking connect!
        const readProvider = new ethers.providers.Web3Provider(window.ethereum);
        const readContract = new ethers.Contract(contractAddress, contractABI, readProvider);
        const events = await readContract.queryFilter("TokensSent");
        
        const clubWalletElement = document.querySelector('.wallet-address[data-full-address]');
        const clubWallet = clubWalletElement ? clubWalletElement.getAttribute('data-full-address').toLowerCase() : null;
        
        // Crucial logic: If admin, the 'studentWallet' is effectively NULL for filtering, 
        // because we only care about the club's own transactions on its dashboard.
        const studentWallet = (loggedInUserType === 'admin') ? null : (wallet ? wallet.toLowerCase() : (dbWallet ? dbWallet.toLowerCase() : null));
        
        console.log("History Calculation - Role:", loggedInUserType, "Club:", clubWallet, "Student:", studentWallet);

        let totalEarned = 0;
        let totalSpent = 0;
        let filteredEvents = events;

        if (clubWallet && studentWallet) {
            // Student-Club specific view (e.g., student visiting a club page)
            filteredEvents = events.filter(e => 
                (e.args.from.toLowerCase() === clubWallet && e.args.to.toLowerCase() === studentWallet) ||
                (e.args.from.toLowerCase() === studentWallet && e.args.to.toLowerCase() === clubWallet)
            );
        } else if (studentWallet || clubWallet) {
            // Global view (Profile or Admin Dashboard)
            const focus = clubWallet || studentWallet;
            filteredEvents = events.filter(e => 
                e.args.from.toLowerCase() === focus || e.args.to.toLowerCase() === focus
            );
        }

        // Loop 1: Calculate Totals
        filteredEvents.forEach(event => {
            const to = event.args.to.toLowerCase();
            const amount = event.args.amount.toNumber();
            let received = false;
            
            // Logic for 'Received': 
            // - For student viewing club: received means TO student.
            // - For admin viewing dashboard: received means TO club.
            if (clubWallet && studentWallet) {
                received = (to === studentWallet);
            } else {
                const focus = clubWallet || studentWallet;
                received = (to === focus);
            }

            if (received) totalEarned += amount;
            else totalSpent += amount;
        });

        console.log("Totals Resolved - Earned/Received:", totalEarned, "Spent/Sent:", totalSpent);

        // Loop 2: Generate Rows
        const rows = filteredEvents.slice().reverse().slice(0, 3).map(event => {
            const from = event.args.from.toLowerCase();
            const to = event.args.to.toLowerCase();
            const amount = event.args.amount.toNumber();
            const purpose = event.args.purpose;
            
            let isReceived = false;
            if (clubWallet && studentWallet) {
                isReceived = (to === studentWallet);
            } else {
                const focus = clubWallet || studentWallet;
                isReceived = (to === focus);
            }

            const timestampObj = new Date(event.args.timestamp.toNumber() * 1000);
            const ts = `${timestampObj.getDate()} ${timestampObj.toLocaleString('en-US', { month: 'short' })}`;
            const color = isReceived ? "text-accent" : "text-danger";
            const prefix = isReceived ? "+" : "-";

            return `<tr><td>${ts}</td><td>${from.substring(0,6)}...</td><td>${to.substring(0,6)}...</td><td class="${color}">${prefix}${amount} CTK</td><td>${purpose}</td></tr>`;
        }).join(""); 

        // Loop 3: Update Stats DOM
        document.querySelectorAll('.stat-card').forEach(card => {
            const label = card.innerText; // More robust than finding h3
            const valEl = card.querySelector('.stat-value, .stats-number, .stat-amount, .stat-value-text');
            if(!valEl) return;

            if (label.includes("Earned") || label.includes("Received") || label.includes("Points")) {
                valEl.innerText = `${totalEarned} CTK`;
            } else if (label.includes("Spent") || label.includes("Sent") || label.includes("Distributed") || label.includes("Issued")) {
                valEl.innerText = `${totalSpent} CTK`;
            }
        });

        // Direct ID updates for maximum reliability (Club & Profile pages)
        const earnedEl = document.getElementById('total-earned') || document.getElementById('total-received');
        const spentEl = document.getElementById('total-spent') || document.getElementById('total-sent');
        if(earnedEl) earnedEl.innerText = `${totalEarned} CTK`;
        if(spentEl) spentEl.innerText = `${totalSpent} CTK`;

        // Loop 4: Update Table DOM
        document.querySelectorAll('.data-table tbody, .transaction-table tbody').forEach(tbody => {
            tbody.innerHTML = rows || '<tr><td colspan="5" style="text-align:center; padding:2rem;">No matching history found.</td></tr>';
        });

        // Loop 5: Update Balance if applicable
        const focusForBalance = clubWallet || studentWallet;
        if (focusForBalance && document.querySelector('.balance-amount')) {
            const bal = await contract.balance(focusForBalance);
            document.querySelectorAll('.balance-amount').forEach(el => el.innerText = bal.toString() + " CTK");
        }
        
    } catch (error) { console.error("History error: ", error); }
}

window.copyToClipboard = () => {
    const target = dbWallet || wallet;
    if (!target) return;
    navigator.clipboard.writeText(target).then(() => {
        const btn = document.querySelector('.copy-btn');
        if(!btn) return;
        const original = btn.innerText;
        btn.innerText = "Copied!";
        setTimeout(() => btn.innerText = original, 2000);
    });
};

window.logoutUser = async () => {
    try {
        const response = await fetch('/api/logout');
        if (response.ok) {
            const data = await response.json();
            // Clear all local session-based wallet flags
            sessionStorage.removeItem('walletConnected');
            localStorage.removeItem('walletConnected');
            // Redirect to landing
            window.location.href = data.redirect;
        }
    } catch (err) { console.error("Logout failed", err); }
};

async function fetchUserInfo() {
    // Clear previous data to prevent identity flicker
    document.querySelectorAll('.profile-name, .user-name').forEach(el => el.innerText = "...");
    document.querySelectorAll('.club-name').forEach(el => el.innerText = "...");
    
    try {
        const response = await fetch('/api/user_info');
        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                dbWallet = data.wallet_address ? data.wallet_address.toLowerCase() : "";
                loggedInUserType = data.user_type;

                if (data.username) {
                    const profileNames = document.querySelectorAll('.profile-name, .user-name');
                    profileNames.forEach(el => el.innerText = data.username.charAt(0).toUpperCase() + data.username.slice(1));
                }
                if (data.club_name) {
                    const clubNames = document.querySelectorAll('.club-name');
                    clubNames.forEach(el => el.innerText = data.club_name.toUpperCase());
                }
                
                if (data.wallet_address) {
                    // Update wallet displays and SET attribute for admins so ledger loads automatically
                    const walletDisplays = document.querySelectorAll('.wallet-address, .admin-address');
                    walletDisplays.forEach(el => {
                        // For admins on dashboard, we WANT the data-full-address set so history loads!
                        if (loggedInUserType === 'admin') {
                            el.setAttribute('data-full-address', data.wallet_address);
                        }

                        if (el.id === 'profile-wallet') {
                            el.innerText = data.wallet_address.substring(0, 6).toUpperCase() + "..." + data.wallet_address.slice(-4).toUpperCase();
                        } else {
                            el.innerText = data.wallet_address;
                        }
                    });
                    
                    const qrCode = document.querySelector('.qr-code');
                    if (qrCode) {
                        qrCode.src = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${data.wallet_address}`;
                        qrCode.onclick = () => window.open(qrCode.src, '_blank');
                    }
                }
            }
        }
    } catch (err) { console.error("Failed to load user info", err); }
}

document.addEventListener("DOMContentLoaded", async () => {
    await fetchUserInfo();
    await loadTransactionHistory();
    await checkConnection();
    
    // Global delegation for send button to handle dynamically loaded content or generic forms
    document.addEventListener('submit', async (e) => {
        if (e.target.id === 'send-token-form') {
            e.preventDefault();
            await sendTokens();
        }
    });

    const connectBtns = document.querySelectorAll('#connect-wallet-btn, .connect-btn');
    connectBtns.forEach(btn => btn.addEventListener('click', connectWallet));
});
