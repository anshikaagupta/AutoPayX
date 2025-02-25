// DOM Elements
const navLinks = document.querySelectorAll('nav a');
const sections = document.querySelectorAll('.section');
const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('fileInput');
const uploadedFilesList = document.getElementById('uploadedFiles');
const paymentForm = document.getElementById('paymentForm');
const verificationStatus = document.getElementById('verificationStatus');
const paymentHistory = document.getElementById('paymentHistory');

// API Endpoints
const API_BASE = 'http://localhost:8001';
const API_ENDPOINTS = {
    UPLOAD: `${API_BASE}/api/documents/upload`,
    VERIFY: `${API_BASE}/api/verify`,
    PAYMENT: `${API_BASE}/api/payments/process`,
    PAYMENT_STATUS: `${API_BASE}/api/payments/status`
};

// Navigation
navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
        e.preventDefault();
        const targetSection = link.getAttribute('data-section');
        
        // Update active states
        navLinks.forEach(l => l.classList.remove('active'));
        sections.forEach(s => s.classList.remove('active'));
        
        link.classList.add('active');
        document.getElementById(targetSection).classList.add('active');
    });
});

// File Upload Handling
dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
});

dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover');
});

dropzone.addEventListener('drop', async (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    
    const files = e.dataTransfer.files;
    await handleFileUpload(files);
});

fileInput.addEventListener('change', async (e) => {
    await handleFileUpload(e.target.files);
});

async function handleFileUpload(files) {
    const formData = new FormData();
    
    for (const file of files) {
        formData.append('files', file);
    }
    
    try {
        const response = await fetch(API_ENDPOINTS.UPLOAD, {
            method: 'POST',
            body: formData
        });
        
        if (!response.ok) throw new Error('Upload failed');
        
        const result = await response.json();
        updateUploadedFilesList(result.files);
        await initiateVerification(result.files);
        
    } catch (error) {
        showError('File upload failed: ' + error.message);
    }
}

function updateUploadedFilesList(files) {
    uploadedFilesList.innerHTML = files.map(file => `
        <li class="upload-item">
            <span>${file.name}</span>
            <span class="status ${file.status}">${file.status}</span>
        </li>
    `).join('');
}

// Document Verification
async function initiateVerification(files) {
    try {
        const response = await fetch(API_ENDPOINTS.VERIFY, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ files })
        });
        
        if (!response.ok) throw new Error('Verification failed');
        
        const result = await response.json();
        updateVerificationStatus(result);
        
    } catch (error) {
        showError('Verification failed: ' + error.message);
    }
}

function updateVerificationStatus(verificationResult) {
    verificationStatus.innerHTML = `
        <div class="status-card ${verificationResult.status}">
            <h4>Document Verification</h4>
            <p>Status: ${verificationResult.status}</p>
            <p>Risk Score: ${verificationResult.riskScore}</p>
            ${verificationResult.issues ? `
                <ul class="issues-list">
                    ${verificationResult.issues.map(issue => `
                        <li>${issue}</li>
                    `).join('')}
                </ul>
            ` : ''}
        </div>
    `;
}

// Payment Processing
paymentForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const paymentData = {
        amount: document.getElementById('amount').value,
        currency: document.getElementById('currency').value,
        paymentMethod: document.getElementById('paymentMethod').value
    };
    
    try {
        const response = await fetch(API_ENDPOINTS.PAYMENT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(paymentData)
        });
        
        if (!response.ok) throw new Error('Payment failed');
        
        const result = await response.json();
        updatePaymentHistory(result);
        showSuccess('Payment processed successfully');
        
    } catch (error) {
        showError('Payment failed: ' + error.message);
    }
});

function updatePaymentHistory(payment) {
    const historyEntry = document.createElement('div');
    historyEntry.className = 'payment-entry';
    historyEntry.innerHTML = `
        <div class="payment-details">
            <h4>Transaction ID: ${payment.transactionId}</h4>
            <p>Amount: ${payment.amount} ${payment.currency}</p>
            <p>Status: ${payment.status}</p>
            <p>Date: ${new Date(payment.timestamp).toLocaleString()}</p>
        </div>
    `;
    
    paymentHistory.insertBefore(historyEntry, paymentHistory.firstChild);
}

// Dashboard Charts
function initializeDashboardCharts() {
    // Timeline Chart
    const timelineCtx = document.getElementById('timelineChart').getContext('2d');
    new Chart(timelineCtx, {
        type: 'line',
        data: {
            labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
            datasets: [{
                label: 'Documents Processed',
                data: [12, 19, 3, 5, 2, 3],
                borderColor: '#2563eb',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
    
    // Document Types Chart
    const typesCtx = document.getElementById('documentTypesChart').getContext('2d');
    new Chart(typesCtx, {
        type: 'doughnut',
        data: {
            labels: ['Invoices', 'Receipts', 'Contracts', 'Other'],
            datasets: [{
                data: [30, 25, 20, 25],
                backgroundColor: [
                    '#2563eb',
                    '#10b981',
                    '#f59e0b',
                    '#6b7280'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });
}

// WebSocket Connection for Real-time Updates
function initializeWebSocket() {
    const ws = new WebSocket('ws://localhost:8001/ws');
    
    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
            case 'verification_update':
                updateVerificationStatus(data.result);
                break;
            case 'payment_update':
                updatePaymentHistory(data.payment);
                break;
            case 'dashboard_update':
                updateDashboardStats(data.stats);
                break;
        }
    };
    
    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };
    
    return ws;
}

// Utility Functions
function showSuccess(message) {
    console.log('Success:', message);
    // Implement success notification UI
}

function showError(message) {
    console.error('Error:', message);
    // Implement error notification UI
}

// Initialize Dashboard
document.addEventListener('DOMContentLoaded', () => {
    initializeDashboardCharts();
    initializeWebSocket();
});

// Update Dashboard Stats
function updateDashboardStats(stats) {
    document.getElementById('docsProcessed').textContent = stats.documentsProcessed;
    document.getElementById('pendingVerification').textContent = stats.pendingVerification;
    document.getElementById('completedPayments').textContent = stats.completedPayments;
}
