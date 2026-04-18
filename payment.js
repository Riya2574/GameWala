// Payment functionality

let selectedMethod = null;
let totalAmount = 0;
let pendingOrder = null;

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
  // Load pendingOrder
  try {
    pendingOrder = JSON.parse(localStorage.getItem('pendingOrder'));
  } catch (e) {
    pendingOrder = null;
  }

  if (pendingOrder) {
    totalAmount = pendingOrder.subtotal;
    const orderId = 'GW' + Date.now().toString(36).substr(-8).toUpperCase();
    document.getElementById('orderId').textContent = orderId;
    populateOrderSummary();
  } else {
    // Fallback
    totalAmount = parseInt(localStorage.getItem('cartTotal'), 10) || 4999;
  }

  updateAmountLabels();

  // Add event listeners to payment method cards
  const methodCards = document.querySelectorAll('.payment-method-card');
  methodCards.forEach(card => {
    card.addEventListener('click', function() {
      selectPaymentMethod(this.dataset.method);
    });
  });
});

function updateAmountLabels() {
  const amountText = formatCurrency(totalAmount);
  document.getElementById('totalAmount').textContent = amountText;
  document.getElementById('qrAmount').textContent = amountText;
  document.getElementById('cardAmount').textContent = amountText;
  document.getElementById('codAmount').textContent = amountText;
}

// Select payment method
function selectPaymentMethod(method) {
  selectedMethod = method;

  // Update UI - remove selection from all cards
  document.querySelectorAll('.payment-method-card').forEach(card => {
    card.classList.remove('selected');
  });

  // Add selection to clicked card
  document.querySelector(`[data-method="${method}"]`).classList.add('selected');

  // Hide all panels
  document.getElementById('upiPanel').classList.add('hidden');
  document.getElementById('cardPanel').classList.add('hidden');
  document.getElementById('codPanel').classList.add('hidden');

  // Show relevant panel
  if (method === 'upi') {
    document.getElementById('upiPanel').classList.remove('hidden');
    updateAmountLabels();
    generateUPIQR();
  } else if (method === 'card') {
    document.getElementById('cardPanel').classList.remove('hidden');
  } else if (method === 'cod') {
    document.getElementById('codPanel').classList.remove('hidden');
  }
}

// Generate UPI QR Code
function generateUPIQR() {
  const qrContainer = document.getElementById('qrCode');
  qrContainer.innerHTML = '';

  const amountText = formatCurrency(totalAmount);
  const upiString = `upi://pay?pa=gamewala@upi&pn=GameWala&am=${totalAmount}&tn=GameWala%20Order%20₹${totalAmount}`;

  document.getElementById('qrAmount').textContent = amountText;

  // Build direct QR image using public API (no client library dependency needed)
  const img = document.createElement('img');
  img.src = `https://api.qrserver.com/v1/create-qr-code/?size=260x260&data=${encodeURIComponent(upiString)}`;
  img.alt = `UPI QR code for ₹${amountText}`;
  img.style.borderRadius = '12px';
  img.style.background = '#ffffff';
  img.style.boxShadow = '0 8px 20px rgba(0, 0, 0, 0.12)';
  img.style.width = '220px';
  img.style.height = '220px';

  qrContainer.appendChild(img);
}

// Populate order summary
function populateOrderSummary() {
  if (!pendingOrder) return;

  const { item, shipping } = pendingOrder;

  // Item
  const summaryItem = document.getElementById('summaryItem');
  summaryItem.innerHTML = `
    <img src="${item.image || 'photo/banner_example.png'}" alt="${item.title}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px;">
    <div>
      <div style="font-weight: 600; color: #1e293b;">${item.title}</div>
      <div style="color: #64748b; font-size: 0.9rem;">${item.platform || ''} • Qty: ${item.quantity || 1}</div>
      <div style="font-weight: 600; color: #0a3cff;">₹${formatCurrency(item.price * (item.quantity || 1))}</div>
    </div>
  `;

  // Shipping
  const summaryShipping = document.getElementById('summaryShipping');
  summaryShipping.innerHTML = `
    <strong>${shipping.name}</strong><br>
    ${shipping.address}<br>
    Phone: ${shipping.phone}
  `;
}

// Format currency
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0
  }).format(amount);
}

// Handle Place Order button
function handlePlaceOrder() {
  if (!selectedMethod) {
    alert('Please select a payment method');
    return;
  }

  if (selectedMethod === 'cod' || selectedMethod === 'upi') {
    // Show confirmation message
    const method = selectedMethod === 'cod' ? 'Cash on Delivery' : 'UPI';
    showPaymentSuccess(method);
  } else if (selectedMethod === 'card') {
    // Validate card details
    if (validateCardForm()) {
      showPaymentSuccess('Card Payment');
    }
  }
}

// Validate card form
function validateCardForm() {
  const inputs = document.querySelectorAll('.card-input');
  for (let input of inputs) {
    if (!input.value.trim()) {
      alert('Please fill in all card details');
      return false;
    }
  }
  return true;
}

// Confirm UPI Payment
function confirmUPIPayment() {
  showPaymentSuccess('UPI');
}

// Confirm Card Payment
function confirmCardPayment() {
  if (validateCardForm()) {
    showPaymentSuccess('Card Payment');
  }
}

// Confirm COD Payment
function confirmCODPayment() {
  showPaymentSuccess('Cash on Delivery');
}

// Show payment success message
function showPaymentSuccess(method) {
  const orderId = document.getElementById('orderId').textContent;
  
  // Store full order
  const fullOrder = pendingOrder ? {
    ...pendingOrder,
    orderId,
    paymentMethod: method,
    date: new Date().toISOString()
  } : {
    orderId,
    amount: totalAmount,
    method: method,
    date: new Date().toISOString()
  };
  localStorage.setItem('lastOrder', JSON.stringify(fullOrder));

  // Show success modal
  const modal = document.createElement('div');
  modal.className = 'payment-success-modal';
  modal.innerHTML = `
    <div class="success-content">
      <div class="success-icon">
        <i class="fa-solid fa-circle-check"></i>
      </div>
      <h2>Payment Successful!</h2>
      <p>Order ID: <strong>${orderId}</strong></p>
      <p>Payment Method: <strong>${method}</strong></p>
      <p>Amount: <strong>₹${formatCurrency(totalAmount)}</strong></p>
      <button onclick="redirectToHome()" class="success-btn">Continue Shopping</button>
    </div>
  `;
  document.body.appendChild(modal);
}

// Redirect to home after payment success
function redirectToHome() {
  // Clear all order data
  localStorage.removeItem('pendingOrder');
  localStorage.removeItem('cart');
  localStorage.removeItem('cartTotal');
  localStorage.removeItem('gamewalaBuyNow');
  localStorage.removeItem('gamewalaCart');
  
  // Redirect
  window.location.href = 'index.html';
}
