// Shared allowed-state maps for barcodes, sessions, and orders.
export const BARCODE_STATES = Object.freeze({
  AVAILABLE: "AVAILABLE",
  RESERVED: "RESERVED",
  SOLD: "SOLD",
  RETURNED: "RETURNED",
});

export const SESSION_STATES = Object.freeze({
  ACTIVE: "ACTIVE",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
});

export const ORDER_STATES = Object.freeze({
  DRAFT: "DRAFT",
  PENDING_APPROVAL: "PENDING_APPROVAL",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED",
});

const orderTransitions = {
  [ORDER_STATES.DRAFT]: [ORDER_STATES.PENDING_APPROVAL, ORDER_STATES.CANCELLED],
  [ORDER_STATES.PENDING_APPROVAL]: [ORDER_STATES.COMPLETED, ORDER_STATES.CANCELLED],
  [ORDER_STATES.COMPLETED]: [],
  [ORDER_STATES.CANCELLED]: [],
};

const sessionTransitions = {
  [SESSION_STATES.ACTIVE]: [SESSION_STATES.COMPLETED, SESSION_STATES.CANCELLED],
  [SESSION_STATES.COMPLETED]: [],
  [SESSION_STATES.CANCELLED]: [],
};

const barcodeTransitions = {
  [BARCODE_STATES.AVAILABLE]: [BARCODE_STATES.RESERVED, BARCODE_STATES.SOLD],
  [BARCODE_STATES.RESERVED]: [BARCODE_STATES.SOLD, BARCODE_STATES.AVAILABLE],
  [BARCODE_STATES.SOLD]: [BARCODE_STATES.RETURNED],
  [BARCODE_STATES.RETURNED]: [BARCODE_STATES.AVAILABLE],
};

// Checks whether a transition is allowed by the provided map.
export function canTransition(map, current, next) {
  const options = map[current] || [];
  return options.includes(next);
}

// Throws when an order transition would violate the workflow.
export function assertOrderTransition(current, next) {
  if (!canTransition(orderTransitions, current, next)) {
    throw new Error(`Invalid order transition from ${current} to ${next}`);
  }
}

// Throws when a session transition would violate the workflow.
export function assertSessionTransition(current, next) {
  if (!canTransition(sessionTransitions, current, next)) {
    throw new Error(`Invalid session transition from ${current} to ${next}`);
  }
}

// Throws when a barcode transition would violate the workflow.
export function assertBarcodeTransition(current, next) {
  if (!canTransition(barcodeTransitions, current, next)) {
    throw new Error(`Invalid barcode transition from ${current} to ${next}`);
  }
}

// Calculates the total quantity and value for a list of items.
export function buildOrderSummary(items = []) {
  return items.reduce(
    (acc, item) => {
      const quantity = Number(item.quantity || item.qty || 0);
      const price = Number(item.price || 0);
      acc.quantity += quantity;
      acc.total += quantity * price;
      return acc;
    },
    { quantity: 0, total: 0 }
  );
}

// Returns a diagram-friendly snapshot of the current workflow graph.
export function buildStateDiagram() {
  return {
    barcode: {
      AVAILABLE: ["RESERVED", "SOLD"],
      RESERVED: ["AVAILABLE", "SOLD"],
      SOLD: ["RETURNED"],
      RETURNED: ["AVAILABLE"],
    },
    session: sessionTransitions,
    order: orderTransitions,
  };
}
