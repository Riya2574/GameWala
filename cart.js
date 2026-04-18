(function () {
  const CART_KEY = 'gamewalaCart';

  function getCart() {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY)) || [];
    } catch (e) {
      return [];
    }
  }

  function saveCart(cart) {
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }

  function getCartCount() {
    return getCart().reduce((sum, item) => sum + (item.quantity || 0), 0);
  }

  const WISHLIST_KEY = 'gamewalaWishlist';
  const BUY_NOW_KEY = 'gamewalaBuyNow';

  if (typeof console !== 'undefined') console.log('cart.js loaded');

  function updateCartBadge() {
    const count = getCartCount();
    document.querySelectorAll('.badge2').forEach(el => {
      el.textContent = count;
    });
  }

  function getWishlist() {
    try {
      const raw = JSON.parse(localStorage.getItem(WISHLIST_KEY));
      if (!Array.isArray(raw)) return [];

      const seen = new Set();
      return raw
        .map(normalizeWishlistItem)
        .filter(Boolean)
        .filter(item => {
          if (!item.id) return false;
          if (seen.has(item.id)) return false;
          seen.add(item.id);
          return true;
        });
    } catch (e) {
      return [];
    }
  }

  function saveWishlist(list) {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify(list));
  }

  function normalizeWishlistItem(item) {
    if (!item || typeof item !== 'object') return null;

    const title = (item.title || '').toString().trim();
    const platform = (item.platform || '').toString().trim();
    const id = computeItemId({ ...item, title, platform });

    if (!id) return null;

    return {
      ...item,
      title,
      platform,
      id,
    };
  }

  function getWishlistCount() {
    return getWishlist().length;
  }

  function updateWishlistBadge() {
    const count = getWishlistCount();
    document.querySelectorAll('.badge').forEach(el => {
      el.textContent = count;
    });
  }

  function isInWishlist(id) {
    if (!id) return false;
    return getWishlist().some(item => item.id === id);
  }

  function syncWishlistIcons() {
    const wishlistIds = new Set(getWishlist().map(i => i.id));

    document.querySelectorAll('.card-heart, .card-heart-icon, .product-hero .fa-heart').forEach(icon => {
      const card = icon.closest('.game-card');
      const productHero = icon.closest('.product-hero');

      const item = card
        ? getItemDataFromCard(card)
        : productHero
        ? getItemDataFromProductPage()
        : null;

      if (!item || !item.id) return;

      const isLiked = wishlistIds.has(item.id);
      icon.classList.toggle('fa-solid', isLiked);
      icon.classList.toggle('fa-regular', !isLiked);
    });
  }

  function toggleWishlist(item) {
    if (!item || !item.title) return;

    const id = computeItemId(item);
    const wishlist = getWishlist();
    const idx = wishlist.findIndex(w => w.id === id);

    if (idx === -1) {
      wishlist.push({ ...item, id });
    } else {
      wishlist.splice(idx, 1);
    }

    saveWishlist(wishlist);
    updateWishlistBadge();
    syncWishlistIcons();
  }

  function setBuyNowItem(item) {
    if (!item || !item.id) return;
    localStorage.setItem(BUY_NOW_KEY, JSON.stringify(item));
  }

  function getBuyNowItem() {
    try {
      return JSON.parse(localStorage.getItem(BUY_NOW_KEY));
    } catch (e) {
      return null;
    }
  }

  function clearBuyNowItem() {
    localStorage.removeItem(BUY_NOW_KEY);
  }

  function normalizeId(value) {
    if (!value) return '';
    return value
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  function computeItemId(item) {
    if (!item) return '';

    // If an explicit ID is already present, use it (supports stable data-id values).
    if (item.id && typeof item.id === 'string' && item.id.trim()) {
      return normalizeId(item.id);
    }

    const title = (item.title || '').toString().trim();
    if (!title) return '';

    const platform = (item.platform || '').toString().trim();

    return normalizeId(`${title}|${platform}`);
  }

  function parsePrice(priceText) {
    if (!priceText) return 0;
    const cleaned = priceText.toString().replace(/₹|,|\s|\+/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }

  function inferPlatformFromTitle(title) {
    if (!title) return '';
    const lower = title.toLowerCase();
    if (lower.includes('ps2')) return 'ps2';
    if (lower.includes('ps3')) return 'ps3';
    if (lower.includes('ps4')) return 'ps4';
    if (lower.includes('ps5')) return 'ps5';
    if (lower.includes('xbox')) return 'xbox';
    return '';
  }

  function getItemDataFromCard(card) {
    if (!card) return null;

    const titleEl = card.querySelector('h3') || card.querySelector('h1');
    const imgEl = card.querySelector('img');

    const title = titleEl
      ? titleEl.textContent.trim()
      : imgEl
      ? imgEl.alt.trim()
      : (card.getAttribute('data-title') || '').trim();

    const priceEl = card.querySelector('.price');
    const price = priceEl ? parsePrice(priceEl.textContent) : 0;

    const image = imgEl ? imgEl.src : '';
    let platform = card.getAttribute('data-platform') || '';
    if (!platform) {
      platform = inferPlatformFromTitle(title);
    }

    let href = card.getAttribute('href') || '';
    href = href.trim();
    if (!href || href === '#' || href.toLowerCase().startsWith('javascript:')) {
      href = '';
    }

    const existingId = (card.getAttribute('data-id') || '').trim();

    const item = {
      title,
      price,
      image,
      platform,
      href,
      quantity: 1,
      id: existingId,
    };

    const id = computeItemId(item);
    if (!existingId || existingId !== id) {
      card.setAttribute('data-id', id);
    }

    return {
      ...item,
      id,
    };
  }

  function getItemDataFromProductPage() {
    const titleEl = document.querySelector('.product-info h1');
    const title = titleEl ? titleEl.textContent.trim() : '';
    const priceEl = document.querySelector('.product-info .price');
    const price = priceEl ? parsePrice(priceEl.textContent) : 0;
    const imageEl = document.querySelector('.image-gallery img');
    const image = imageEl ? imageEl.src : '';
    const qtyInput = document.querySelector('.buy-box input[type="number"]');
    const quantity = qtyInput ? Math.max(1, parseInt(qtyInput.value) || 1) : 1;

    const href = window.location.pathname || '';
    const platform = inferPlatformFromTitle(title);

    const item = {
      title,
      price,
      image,
      quantity,
      platform,
      href,
    };

    return {
      ...item,
      id: computeItemId(item),
    };
  }

  function addToCart(item) {
    if (!item || !item.title) return;
    const cart = getCart();
    const existing = cart.find(c => c.id === item.id);
    if (existing) {
      existing.quantity = (existing.quantity || 0) + (item.quantity || 1);
    } else {
      cart.push({ ...item, quantity: item.quantity || 1 });
    }
    saveCart(cart);
    updateCartBadge();
  }

  function removeFromCart(id) {
    const cart = getCart().filter(item => item.id !== id);
    saveCart(cart);
    updateCartBadge();
    renderCartPage();
  }

  function updateCartItemQuantity(id, quantity) {
    const cart = getCart();
    const item = cart.find(i => i.id === id);
    if (!item) return;
    item.quantity = Math.max(1, quantity);
    saveCart(cart);
    updateCartBadge();
    renderCartPage();
  }

  function handleAddToCartClick(event) {
    event.preventDefault();
    event.stopPropagation();
    const target = event.currentTarget;
    let card = target.closest('.game-card');

    // Fallback to product page
    if (!card) {
      const productSection = document.querySelector('.product-hero');
      if (productSection) {
        const item = getItemDataFromProductPage();
        addToCart(item);
        return;
      }
      return;
    }

    const item = getItemDataFromCard(card);
    if (!item) return;
    addToCart(item);
  }

  function setupAddToCartHandlers() {
    document.addEventListener('click', event => {
      const btn = event.target.closest('.add-to-cart, .add-to-cart-btn, .card-cart');
      if (!btn) return;

      event.preventDefault();
      event.stopPropagation();

      const card = btn.closest('.game-card');
      if (!card) {
        const productSection = document.querySelector('.product-hero');
        if (productSection) {
          addToCart(getItemDataFromProductPage());
        }
        return;
      }

      const item = getItemDataFromCard(card);
      if (!item) return;
      console.log('add-to-cart clicked', item);
      addToCart(item);
    });
  }

  function setupCartIconNav() {
    const cartIcons = Array.from(document.querySelectorAll('.fa-bag-shopping, .fa-cart-shopping'));
    cartIcons.forEach(icon => {
      icon.style.cursor = 'pointer';
      icon.addEventListener('click', () => {
        window.location.href = 'cart.html';
      });
    });
  }

  function disableCardNavigation() {
    document.querySelectorAll('a.game-card').forEach(card => {
      card.addEventListener('click', event => {
        // Prevent the card anchor from navigating when the user is interacting
        // with internal action buttons (add to cart / wishlist / buy now).
        // Allow normal navigation when clicking elsewhere on the card.
        if (event.target.closest('.card-actions')) {
          event.preventDefault();
        }
      });
    });
  }

  function setupWishlistHandlers() {
    document.addEventListener('click', event => {
      const cardHeart = event.target.closest('.card-heart, .card-heart-icon');
      const headerHeart = event.target.closest('.headerActions .fa-heart');
      const cardActions = event.target.closest('.card-actions');
      const btn = cardHeart || headerHeart || (cardActions ? cardActions.querySelector('.card-heart, .card-heart-icon') : null);
      if (!btn) return;

      event.preventDefault();
      event.stopPropagation();

      // Header heart should navigate to wishlist page
      if (headerHeart && !cardHeart) {
        window.location.href = 'wishlist.html';
        return;
      }

      const card = btn.closest('.game-card');
      if (!card) {
        const productSection = document.querySelector('.product-hero');
        if (productSection) {
          const item = getItemDataFromProductPage();
          toggleWishlist(item);

        }
        return;
      }

      const item = getItemDataFromCard(card);
      console.log('wishlist clicked', item);
      toggleWishlist(item);

    });
  }

  function setupBuyNowHandlers() {
    document.addEventListener('click', event => {
      const btn = event.target.closest('.buy-now, .buy-now-btn');
      if (!btn) return;

      event.preventDefault();
      event.stopPropagation();

      let item = null;
      const card = btn.closest('.game-card');
      if (card) {
        item = getItemDataFromCard(card);
      } else {
        const productSection = document.querySelector('.product-hero');
        if (productSection) {
          item = getItemDataFromProductPage();
        }
      }

      if (!item) return;
      console.log('buy-now clicked', item);
      setBuyNowItem(item);
      window.location.href = 'buy-now.html';
    });
  }

  function renderWishlistPage() {
    const container = document.getElementById('wishlistItems');
    if (!container) return;

    const wishlist = getWishlist();
    container.innerHTML = '';

    if (wishlist.length === 0) {
      container.innerHTML = '<div style="text-align:center; padding:60px 20px;"><h2>Your wishlist is empty</h2><p>Add something to your wishlist to save for later.</p><a href="index.html" style="display:inline-block;margin-top:20px;padding:12px 24px;border-radius:8px;background:#0a3cff;color:#fff;text-decoration:none;">Browse products</a></div>';
      updateWishlistBadge();
      return;
    }

    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';

    const thead = document.createElement('thead');
    thead.innerHTML = '<tr style="border-bottom:2px solid #e2e8f0;"><th style="text-align:left;padding:12px;">Product</th><th style="padding:12px;">Price</th><th style="padding:12px;">Actions</th></tr>';
    table.appendChild(thead);

    const tbody = document.createElement('tbody');

    wishlist.forEach(item => {
      const row = document.createElement('tr');
      row.style.borderBottom = '1px solid #e5e7eb';
      row.style.verticalAlign = 'middle';

      const titleCell = document.createElement('td');
      titleCell.style.padding = '12px';
      titleCell.style.display = 'flex';
      titleCell.style.alignItems = 'center';
      titleCell.style.gap = '12px';

      const img = document.createElement('img');
      img.src = item.image || 'photo/banner_example.png';
      img.alt = item.title;
      img.style.width = '80px';
      img.style.height = '80px';
      img.style.objectFit = 'cover';
      img.style.borderRadius = '12px';

      const titleWrap = document.createElement('div');
      titleWrap.innerHTML = `<div style="font-weight:600; color:#0f172a;">${item.title}</div><div style="color:#6b7280; font-size:0.9rem;">${item.platform || ''}</div>`;

      titleCell.appendChild(img);
      titleCell.appendChild(titleWrap);

      const priceCell = document.createElement('td');
      priceCell.style.padding = '12px';
      priceCell.textContent = `₹${item.price.toLocaleString()}`;

      const actionsCell = document.createElement('td');
      actionsCell.style.padding = '12px';
      actionsCell.style.display = 'flex';
      actionsCell.style.gap = '10px';

      const addToCartBtn = document.createElement('button');
      addToCartBtn.textContent = 'Add to Cart';
      addToCartBtn.style.padding = '8px 14px';
      addToCartBtn.style.border = 'none';
      addToCartBtn.style.background = '#0a3cff';
      addToCartBtn.style.color = '#fff';
      addToCartBtn.style.borderRadius = '8px';
      addToCartBtn.style.cursor = 'pointer';
      addToCartBtn.addEventListener('click', () => {
        addToCart(item);
      });

      const removeBtn = document.createElement('button');
      removeBtn.textContent = 'Remove';
      removeBtn.style.padding = '8px 14px';
      removeBtn.style.border = '1px solid #e2e8f0';
      removeBtn.style.background = '#fff';
      removeBtn.style.color = '#0a3cff';
      removeBtn.style.borderRadius = '8px';
      removeBtn.style.cursor = 'pointer';
      removeBtn.addEventListener('click', () => {
        toggleWishlist(item);
        renderWishlistPage();
      });

      actionsCell.appendChild(addToCartBtn);
      actionsCell.appendChild(removeBtn);

      row.appendChild(titleCell);
      row.appendChild(priceCell);
      row.appendChild(actionsCell);

      tbody.appendChild(row);
    });

    table.appendChild(tbody);
    container.appendChild(table);
    updateWishlistBadge();
  }

  function renderBuyNowPage() {
    const container = document.getElementById('buyNowContainer');
    if (!container) return;

    const item = getBuyNowItem();
    container.innerHTML = '';

    if (!item || !item.title) {
      container.innerHTML = '<div style="text-align:center; padding:60px 20px;"><h2>No item selected for purchase</h2><p>Please choose "Buy Now" from a product to start checkout.</p><a href="index.html" style="display:inline-block;margin-top:20px;padding:12px 24px;border-radius:8px;background:#0a3cff;color:#fff;text-decoration:none;">Continue Shopping</a></div>';
      return;
    }

    const summary = document.createElement('div');
    summary.style.display = 'grid';
    summary.style.gridTemplateColumns = '1fr 1fr';
    summary.style.gap = '28px';
    summary.style.alignItems = 'start';

    const itemCard = document.createElement('div');
    itemCard.style.border = '1px solid #e2e8f0';
    itemCard.style.borderRadius = '18px';
    itemCard.style.padding = '24px';
    itemCard.style.background = '#fff';

    const title = document.createElement('h2');
    title.textContent = item.title;
    title.style.marginTop = '0';

    const img = document.createElement('img');
    img.src = item.image || 'photo/banner_example.png';
    img.alt = item.title;
    img.style.width = '100%';
    img.style.borderRadius = '14px';
    img.style.margin = '16px 0';

    const price = document.createElement('div');
    price.textContent = `Price: ₹${item.price.toLocaleString()}`;
    price.style.fontSize = '1.3rem';
    price.style.fontWeight = '700';
    price.style.color = '#0a3cff';

    itemCard.appendChild(title);
    itemCard.appendChild(img);
    itemCard.appendChild(price);

    const form = document.createElement('div');
    form.style.border = '1px solid #e2e8f0';
    form.style.borderRadius = '18px';
    form.style.padding = '24px';
    form.style.background = '#fff';

    form.innerHTML = `
      <h2 style="margin-top:0;">Shipping & Payment</h2>
      <label style="display:block; margin:14px 0 6px; font-weight:600;">Full Name</label>
      <input id="buyNowName" type="text" placeholder="Your name" style="width:100%; padding:12px; border:1px solid #cbd5e1; border-radius:10px;" />
      <label style="display:block; margin:14px 0 6px; font-weight:600;">Address</label>
      <textarea id="buyNowAddress" placeholder="Shipping address" style="width:100%; padding:12px; border:1px solid #cbd5e1; border-radius:10px; min-height:100px;"></textarea>
      <label style="display:block; margin:14px 0 6px; font-weight:600;">Phone</label>
      <input id="buyNowPhone" type="tel" placeholder="Mobile number" style="width:100%; padding:12px; border:1px solid #cbd5e1; border-radius:10px;" />
      <button id="buyNowSubmit" style="margin-top:18px; width:100%; padding:14px; border:none; border-radius:12px; background:#0a3cff; color:#fff; font-size:1rem; cursor:pointer;">Place Order</button>
    `;

    summary.appendChild(itemCard);
    summary.appendChild(form);
    container.appendChild(summary);

    document.getElementById('buyNowSubmit').addEventListener('click', () => {
      const name = document.getElementById('buyNowName').value.trim();
      const address = document.getElementById('buyNowAddress').value.trim();
      const phone = document.getElementById('buyNowPhone').value.trim();

      if (!name || !address || !phone) {
        alert('Please fill in all shipping details.');
        return;
      }

      clearBuyNowItem();
      alert(`Order placed!\n\n${item.title} will be shipped to:\n${name}\n${address}\n\nWe will contact you at ${phone}.`);
      window.location.href = 'index.html';
    });
  }

  function renderCartPage() {
    const container = document.getElementById('cartItems');
    if (!container) return;

    const cart = getCart();
    container.innerHTML = '';

    if (cart.length === 0) {
      container.innerHTML = '<div style="text-align:center; padding:60px 20px;"><h2>Your cart is empty</h2><p>Add something from the store to get started.</p><a href="index.html" style="display:inline-block;margin-top:20px;padding:12px 24px;border-radius:8px;background:#0a3cff;color:#fff;text-decoration:none;">Continue Shopping</a></div>';
      updateCartBadge();
      return;
    }

    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';

    const thead = document.createElement('thead');
    thead.innerHTML = '<tr style="border-bottom:2px solid #e2e8f0;"><th style="text-align:left;padding:12px;">Product</th><th style="padding:12px;">Price</th><th style="padding:12px;">Qty</th><th style="padding:12px;">Total</th><th style="padding:12px;">&nbsp;</th></tr>';
    table.appendChild(thead);

    const tbody = document.createElement('tbody');

    let grandTotal = 0;
    cart.forEach(item => {
      const row = document.createElement('tr');
      row.style.borderBottom = '1px solid #e5e7eb';
      row.style.verticalAlign = 'middle';

      const titleCell = document.createElement('td');
      titleCell.style.padding = '12px';
      titleCell.style.display = 'flex';
      titleCell.style.alignItems = 'center';
      titleCell.style.gap = '12px';

      const img = document.createElement('img');
      img.src = item.image || 'photo/banner_example.png';
      img.alt = item.title;
      img.style.width = '80px';
      img.style.height = '80px';
      img.style.objectFit = 'cover';
      img.style.borderRadius = '12px';

      const titleWrap = document.createElement('div');
      titleWrap.innerHTML = `<div style="font-weight:600; color:#0f172a;">${item.title}</div><div style="color:#6b7280; font-size:0.9rem;">${item.platform || ''}</div>`;

      titleCell.appendChild(img);
      titleCell.appendChild(titleWrap);

      const priceCell = document.createElement('td');
      priceCell.style.padding = '12px';
      priceCell.textContent = `₹${item.price.toLocaleString()}`;

      const qtyCell = document.createElement('td');
      qtyCell.style.padding = '12px';
      const qtyInput = document.createElement('input');
      qtyInput.type = 'number';
      qtyInput.min = '1';
      qtyInput.value = item.quantity;
      qtyInput.style.width = '60px';
      qtyInput.style.padding = '8px';
      qtyInput.style.border = '1px solid #cbd5e1';
      qtyInput.style.borderRadius = '8px';
      qtyInput.addEventListener('change', () => {
        const newQty = parseInt(qtyInput.value) || 1;
        updateCartItemQuantity(item.id, newQty);
      });
      qtyCell.appendChild(qtyInput);

      const totalCell = document.createElement('td');
      totalCell.style.padding = '12px';
      const lineTotal = item.price * item.quantity;
      totalCell.textContent = `₹${lineTotal.toLocaleString()}`;
      grandTotal += lineTotal;

      const removeCell = document.createElement('td');
      removeCell.style.padding = '12px';
      const removeBtn = document.createElement('button');
      removeBtn.textContent = 'Remove';
      removeBtn.style.padding = '8px 14px';
      removeBtn.style.border = '1px solid #e2e8f0';
      removeBtn.style.background = '#fff';
      removeBtn.style.color = '#0a3cff';
      removeBtn.style.borderRadius = '8px';
      removeBtn.style.cursor = 'pointer';
      removeBtn.addEventListener('click', () => removeFromCart(item.id));
      removeCell.appendChild(removeBtn);

      row.appendChild(titleCell);
      row.appendChild(priceCell);
      row.appendChild(qtyCell);
      row.appendChild(totalCell);
      row.appendChild(removeCell);

      tbody.appendChild(row);
    });

    table.appendChild(tbody);
    container.appendChild(table);

    const summary = document.createElement('div');
    summary.style.marginTop = '24px';
    summary.style.display = 'flex';
    summary.style.justifyContent = 'space-between';
    summary.style.alignItems = 'center';

    const totalText = document.createElement('div');
    totalText.innerHTML = `<div style="font-size:1.4rem; font-weight:700;">Total:</div><div style="font-size:1.2rem; color:#0a3cff;">₹${grandTotal.toLocaleString()}</div>`;

    const checkoutButton = document.createElement('button');
    checkoutButton.textContent = 'Checkout';
    checkoutButton.style.padding = '14px 26px';
    checkoutButton.style.border = 'none';
    checkoutButton.style.borderRadius = '12px';
    checkoutButton.style.background = '#0a3cff';
    checkoutButton.style.color = '#fff';
    checkoutButton.style.fontSize = '1rem';
    checkoutButton.style.cursor = 'pointer';
    checkoutButton.addEventListener('click', () => {
      alert('Checkout is not yet implemented. Your cart is saved in local storage.');
    });

    summary.appendChild(totalText);
    summary.appendChild(checkoutButton);
    container.appendChild(summary);
  }

  function initCart() {
    updateCartBadge();
    updateWishlistBadge();
    syncWishlistIcons();
    setupAddToCartHandlers();
    setupCartIconNav();
    disableCardNavigation();
    setupWishlistHandlers();
    setupBuyNowHandlers();
    renderCartPage();
    renderWishlistPage();
    renderBuyNowPage();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCart);
  } else {
    initCart();
  }
})();
