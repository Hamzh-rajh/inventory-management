// Clock
function updateClock() {
  const el = document.getElementById('clock');
  if (el) {
    const now = new Date();
    el.textContent = now.toLocaleTimeString('ar-SA');
  }
}
setInterval(updateClock, 1000);
updateClock();

// Sidebar toggle (mobile)
function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

// Confirm delete
function confirmDelete(form) {
  if (confirm('هل أنت متأكد من الحذف؟')) {
    form.submit();
  }
  return false;
}

// Invoice items management
let itemIndex = 0;

function addItem() {
  const template = document.getElementById('item-template');
  if (!template) return;
  const clone = template.content.cloneNode(true);
  const inputs = clone.querySelectorAll('[data-name]');
  inputs.forEach(input => {
    input.name = `items[${itemIndex}][${input.dataset.name}]`;
  });
  document.getElementById('items-body').appendChild(clone);
  itemIndex++;
  updateTotal();
}

function removeItem(btn) {
  btn.closest('tr').remove();
  updateTotal();
}

function updateTotal() {
  let total = 0;
  document.querySelectorAll('.item-row').forEach(row => {
    const qty = parseFloat(row.querySelector('.item-qty')?.value) || 0;
    const price = parseFloat(row.querySelector('.item-price')?.value) || 0;
    const subtotal = qty * price;
    const subtotalEl = row.querySelector('.item-subtotal');
    if (subtotalEl) subtotalEl.textContent = subtotal.toFixed(2);
    total += subtotal;
  });
  const totalEl = document.getElementById('invoice-total');
  if (totalEl) totalEl.textContent = total.toFixed(2);
}

// Fill price when product selected
function onProductSelect(select) {
  const row = select.closest('tr');
  const option = select.options[select.selectedIndex];
  const price = option.dataset.price || 0;
  const stock = option.dataset.stock || 0;
  const priceInput = row.querySelector('.item-price');
  const stockSpan = row.querySelector('.item-stock');
  if (priceInput) priceInput.value = price;
  if (stockSpan) stockSpan.textContent = `متوفر: ${stock}`;
  updateTotal();
}

// Auto-highlight active nav link
document.querySelectorAll('.sidebar-nav .nav-link').forEach(link => {
  if (link.href === window.location.href) {
    link.classList.add('active');
  }
});
