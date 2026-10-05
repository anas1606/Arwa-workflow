import prisma from '@/lib/prisma';

const round = (n) => Math.round((n + Number.EPSILON) * 10000) / 10000;

export const calculateRawMaterialPlanning = async ({ products, isReserved, origin }) => {
    try {
        if (!products || !Array.isArray(products) || products.length === 0) {
            return { success: false, message: 'No products provided' };
        }

        // Cache BOM lookups so shared sub-assemblies are fetched only once per request
        const bomCache = new Map();
        const getBom = (productId) => {
            if (!bomCache.has(productId)) {
                bomCache.set(
                    productId,
                    prisma.bom.findFirst({
                        where: { productId, is_deleted: false },
                        include: {
                            items: {
                                include: {
                                    product: {
                                        select: { id: true, name: true, code: true, image: true, stockQuantity: true, origin: true }
                                    }
                                }
                            }
                        }
                    })
                );
            }
            return bomCache.get(productId);
        };

        // Demand of every target product's BOM components (the target products themselves are not listed)
        const rootEntries = [];
        for (const p of products) {
            const requestedQty = parseFloat(p.quantity) || 0;
            if (requestedQty <= 0) continue;

            const bom = await getBom(p.productId);
            if (!bom || bom.items.length === 0) {
                const product = await prisma.product.findUnique({
                    where: { id: p.productId, is_deleted: false },
                    select: { id: true, name: true, code: true, image: true, stockQuantity: true, origin: true }
                });
                if (product) {
                    rootEntries.push({
                        product,
                        isIdentifier: false,
                        requiredQuantity: requestedQty,
                        reservedQuantity: 0
                    });
                }
                continue;
            }

            // Number of finished target units already "committed" through the identifier component
            let reservedParentQty = 0;
            if (isReserved) {
                const identifierItem = bom.items.find(i => i.isIdentifier);
                if (identifierItem && identifierItem.quantity > 0) {
                    const identifierStock = identifierItem.product.stockQuantity || 0;
                    reservedParentQty = Math.floor(identifierStock / identifierItem.quantity);
                }
            }

            for (const item of bom.items) {
                rootEntries.push({
                    product: item.product,
                    isIdentifier: !!item.isIdentifier,
                    requiredQuantity: item.quantity * requestedQty,
                    reservedQuantity: reservedParentQty * item.quantity
                });
            }
        }

        // One entry per product, no matter how many places it is used (e.g. a wire kit under Display and Heater)
        const state = new Map();
        const addDemand = (e) => {
            const existing = state.get(e.product.id);
            if (existing) {
                existing.requiredQuantity += e.requiredQuantity;
                existing.reservedQuantity += e.reservedQuantity;
                existing.isIdentifier = existing.isIdentifier || e.isIdentifier;
            } else {
                state.set(e.product.id, {
                    product: e.product,
                    isIdentifier: e.isIdentifier,
                    requiredQuantity: e.requiredQuantity,
                    reservedQuantity: e.reservedQuantity
                });
            }
        };
        rootEntries.forEach(addDemand);

        // Discover every sub-assembly that could be reached, so we can process parents before children.
        // This guarantees a shared component has received demand from ALL its parents before its own
        // shortage is calculated.
        const childrenOf = new Map();
        const inDegree = new Map();
        const stack = rootEntries.map(e => e.product.id);
        stack.forEach(id => { if (!inDegree.has(id)) inDegree.set(id, 0); });
        const discovered = new Set();
        while (stack.length) {
            const id = stack.pop();
            if (discovered.has(id)) continue;
            discovered.add(id);
            const bom = await getBom(id);
            const items = bom ? bom.items : [];
            childrenOf.set(id, items);
            for (const item of items) {
                inDegree.set(item.productId, (inDegree.get(item.productId) || 0) + 1);
                stack.push(item.productId);
            }
        }

        // Shortage-driven expansion: a component's own BOM is only used for the quantity it is short by
        const queue = [...inDegree.entries()].filter(([, d]) => d === 0).map(([id]) => id);
        while (queue.length) {
            const id = queue.shift();
            const node = state.get(id);
            const items = childrenOf.get(id) || [];

            if (node) {
                const actualStock = node.product.stockQuantity || 0;
                const shortage = Math.max(0, node.requiredQuantity + node.reservedQuantity - actualStock);
                if (shortage > 0 && items.length > 0) {
                    // The missing units are built from the sub-BOM, so this row itself is not shown
                    node.expanded = true;
                    
                    let subReservedParentQty = 0;
                    if (isReserved) {
                        const identifierItem = items.find(i => i.isIdentifier);
                        if (identifierItem && identifierItem.quantity > 0) {
                            const identifierStock = identifierItem.product.stockQuantity || 0;
                            subReservedParentQty = Math.floor(identifierStock / identifierItem.quantity);
                        }
                    }

                    for (const item of items) {
                        addDemand({
                            product: item.product,
                            isIdentifier: !!item.isIdentifier,
                            requiredQuantity: shortage * item.quantity,
                            reservedQuantity: subReservedParentQty * item.quantity
                        });
                    }
                }
            }

            for (const item of items) {
                const d = inDegree.get(item.productId) - 1;
                inDegree.set(item.productId, d);
                if (d === 0) queue.push(item.productId);
            }
        }

        let result = [...state.values()].filter(m => !m.expanded).map(m => {
            const actualStock = m.product.stockQuantity || 0;
            const shortage = Math.max(0, m.requiredQuantity + m.reservedQuantity - actualStock);
            return {
                productId: m.product.id,
                productName: m.product.name,
                productCode: m.product.code,
                image: m.product.image || null,
                origin: m.product.origin,
                isIdentifier: m.isIdentifier,
                actualStock: round(actualStock),
                requiredQuantity: round(m.requiredQuantity),
                reservedQuantity: round(m.reservedQuantity),
                availableQuantity: round(actualStock),
                needsToOrder: round(shortage)
            };
        });

        if (origin && origin !== 'ALL') {
            result = result.filter(r => r.origin === origin);
        }

        const orderIndex = new Map();
        let currentIdx = 0;
        const q = rootEntries.map(e => e.product.id);
        
        while (q.length > 0) {
            const id = q.shift();
            if (orderIndex.has(id)) continue;
            
            orderIndex.set(id, currentIdx++);
            const items = childrenOf.get(id) || [];
            for (const item of items) {
                q.push(item.productId);
            }
        }

        result.sort((a, b) => (orderIndex.get(a.productId) ?? Infinity) - (orderIndex.get(b.productId) ?? Infinity));

        return { success: true, data: result };
    } catch (err) {
        console.error('Error in calculateRawMaterialPlanning:', err);
        return { success: false, message: 'Internal server error while calculating raw material planning' };
    }
};
