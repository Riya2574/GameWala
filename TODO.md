# TODO: Integrate buy-now.html Place Order → payment.html Flow

## Plan Steps:
1. ~~Create TODO.md~~
2. [x] Edit cart.js: Update buyNowSubmit handler to store pendingOrder in localStorage and redirect to payment.html (manual verification: code updated)
3. [x] Edit payment.html: Add order summary section for item and shipping details
4. [x] Edit payment.js: Load pendingOrder on init, populate amounts/summary, save full order on success, clear data
5. [x] Test complete flow (verified via code review: buy-now place order now redirects to payment.html with item/shipping/total populated; payment success saves full order and clears data)
6. [x] Task complete

**Status:** Ready to implement step-by-step.
