import prisma from '@/lib/prisma';

export const createArea = async (data, userId = null) => {
    try {
        const createPayload = {
            name: data.name,
            createdBy: userId,
        };

        const existingArea = await prisma.area.findFirst({
            where: { name: data.name, is_deleted: false }
        });
        if (existingArea) {
            return { success: false, message: `Area with name "${data.name}" already exists.` };
        }

        if (data.sections && data.sections.length > 0) {
            const sectionNames = new Set();
            for (const section of data.sections) {
                if (sectionNames.has(section.name)) {
                    return { success: false, message: `Duplicate section name "${section.name}" in area.` };
                }
                sectionNames.add(section.name);
                if (section.trays && section.trays.length > 0) {
                    const trayNames = new Set();
                    for (const tray of section.trays) {
                        if (trayNames.has(tray.name)) {
                            return { success: false, message: `Duplicate tray name "${tray.name}" in section "${section.name}".` };
                        }
                        trayNames.add(tray.name);
                    }
                }
            }

            createPayload.sections = {
                create: data.sections.map(section => ({
                    name: section.name,
                    createdBy: userId,
                    trays: section.trays && section.trays.length > 0 ? {
                        create: section.trays.map(tray => ({
                            name: tray.name,
                            createdBy: userId
                        }))
                    } : undefined
                }))
            };
        }

        const result = await prisma.area.create({
            data: createPayload,
        });
        return { success: true, data: result };
    } catch (error) {
        console.error('Error in createArea service:', error);
        return { success: false, message: 'An internal server error occurred while creating area.' };
    }
};

export const getAllAreas = async (page = 1, limit = 10, search = '') => {
    try {
        const skip = (page - 1) * limit;
        const take = parseInt(limit);
        const where = { is_deleted: false };

        if (search) {
            where.name = { contains: search, mode: 'insensitive' };
        }

        const [data, total] = await Promise.all([
            prisma.area.findMany({
                where,
                skip,
                take,
                orderBy: { createdAt: 'desc' },
                select: {
                    id: true,
                    name: true,
                    createdAt: true,
                    updatedAt: true,
                    createdBy: true,
                    updatedBy: true,
                    sections: {
                        where: { is_deleted: false },
                        select: {
                            id: true,
                            _count: {
                                select: {
                                    trays: { where: { is_deleted: false } }
                                }
                            }
                        }
                    }
                }
            }),
            prisma.area.count({ where })
        ]);

        const userIds = [...new Set(data.flatMap(b => [b.createdBy, b.updatedBy]).filter(Boolean))];
        const users = await prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, username: true }
        });
        const userMap = {};
        users.forEach(u => {
            userMap[u.id] = u.username;
        });

        const totalPages = Math.ceil(total / take);

        const mappedData = data.map(area => ({
            id: area.id,
            name: area.name,
            sectionsCount: area.sections.length,
            traysCount: area.sections.reduce((acc, s) => acc + s._count.trays, 0),
            createdAt: area.createdAt,
            updatedAt: area.updatedAt,
            createdByName: area.createdBy ? userMap[area.createdBy] || area.createdBy : 'Unknown',
            updatedByName: area.updatedBy ? userMap[area.updatedBy] || area.updatedBy : '-',
        }));

        return { 
            success: true, 
            data: {
                data: mappedData,
                pagination: {
                    totalItems: total,
                    pageSize: take,
                    pageNo: parseInt(page),
                    totalPages
                }
            } 
        };
    } catch (error) {
        console.error('Error in getAllAreas service:', error);
        return { success: false, message: 'An internal server error occurred while fetching areas.' };
    }
};

export const getAreaKpis = async () => {
    try {
        const [totalAreas, areasWithoutSections] = await Promise.all([
            prisma.area.count({ where: { is_deleted: false } }),
            prisma.area.count({ 
                where: { 
                    is_deleted: false,
                    sections: { none: { is_deleted: false } }
                } 
            }),
        ]);

        const sections = await prisma.section.findMany({
            where: { is_deleted: false },
            select: {
                id: true,
                _count: {
                    select: { trays: { where: { is_deleted: false } } }
                }
            }
        });

        const totalSections = sections.length;
        const totalTrays = sections.reduce((sum, s) => sum + s._count.trays, 0);

        return {
            success: true,
            data: {
                totalAreas,
                totalSections,
                totalTrays,
                areasWithoutSections
            }
        };
    } catch (error) {
        console.error('Error in getAreaKpis service:', error);
        return { success: false, message: 'An internal error occurred while fetching area KPIs' };
    }
};

export const getAreaById = async (id) => {
    try {
        const box = await prisma.area.findUnique({
            where: { id, is_deleted: false },
            select: {
                id: true,
                name: true,
                sections: {
                    where: { is_deleted: false },
                    select: {
                        id: true,
                        name: true,
                        trays: {
                            where: { is_deleted: false },
                            select: {
                                id: true,
                                name: true
                            }
                        }
                    }
                }
            }
        });

        if (!box) {
            return { success: false, message: 'Area not found' };
        }

        return { success: true, data: box };
    } catch (error) {
        console.error('Error in getAreaById service:', error);
        return { success: false, message: 'An internal server error occurred while fetching the area.' };
    }
};

export const updateArea = async (id, data, userId = null) => {
    try {
        const existing = await prisma.area.findUnique({
            where: { id, is_deleted: false },
            include: {
                sections: {
                    where: { is_deleted: false },
                    include: {
                        trays: { where: { is_deleted: false } }
                    }
                }
            }
        });

        if (!existing) {
            return { success: false, message: 'Area not found' };
        }

        const updateData = {};
        if (data.name !== undefined) {
            const existingAreaName = await prisma.area.findFirst({
                where: { name: data.name, is_deleted: false, id: { not: id } }
            });
            if (existingAreaName) {
                return { success: false, message: `Area with name "${data.name}" already exists.` };
            }
            updateData.name = data.name;
        }
        if (userId) updateData.updatedBy = userId;

        if (data.sections) {
            const sectionNames = new Set();
            for (const section of data.sections) {
                if (sectionNames.has(section.name)) {
                    return { success: false, message: `Duplicate section name "${section.name}" in area.` };
                }
                sectionNames.add(section.name);
                if (section.trays && section.trays.length > 0) {
                    const trayNames = new Set();
                    for (const tray of section.trays) {
                        if (trayNames.has(tray.name)) {
                            return { success: false, message: `Duplicate tray name "${tray.name}" in section "${section.name}".` };
                        }
                        trayNames.add(tray.name);
                    }
                }
            }
        }

        const result = await prisma.$transaction(async (tx) => {
            // 1. Update Area properties
            const updatedBox = await tx.area.update({
                where: { id },
                data: updateData
            });

            // 2. Process Sections and Trays if provided
            if (data.sections) {
                const incomingSections = data.sections;
                
                // Identify incoming IDs (string IDs denote existing records)
                const incomingSectionIds = incomingSections.filter(s => typeof s.id === 'string').map(s => s.id);
                
                // Soft delete sections that are missing from the incoming data
                const sectionsToDelete = existing.sections.filter(s => !incomingSectionIds.includes(s.id));
                for (const sec of sectionsToDelete) {
                    await tx.section.update({
                        where: { id: sec.id },
                        data: { is_deleted: true, deletedAt: new Date(), deletedBy: userId }
                    });
                    // Soft delete associated trays
                    await tx.tray.updateMany({
                        where: { sectionId: sec.id, is_deleted: false },
                        data: { is_deleted: true, deletedAt: new Date(), deletedBy: userId }
                    });
                }

                // Process each incoming section
                for (const sec of incomingSections) {
                    let sectionId = sec.id;
                    const isNewSection = typeof sectionId !== 'string' || !existing.sections.find(s => s.id === sectionId);

                    if (isNewSection) {
                        // Create new section
                        await tx.section.create({
                            data: {
                                name: sec.name,
                                areaId: id,
                                createdBy: userId,
                                trays: sec.trays && sec.trays.length > 0 ? {
                                    create: sec.trays.map(t => ({ name: t.name, createdBy: userId }))
                                } : undefined
                            }
                        });
                    } else {
                        // Update existing section
                        const existingSec = existing.sections.find(s => s.id === sectionId);
                        await tx.section.update({
                            where: { id: sectionId },
                            data: { name: sec.name, updatedBy: userId }
                        });

                        // Process trays for this section
                        if (sec.trays) {
                            const incomingTrayIds = sec.trays.filter(t => typeof t.id === 'string').map(t => t.id);
                            const traysToDelete = existingSec.trays.filter(t => !incomingTrayIds.includes(t.id));
                            
                            // Delete removed trays
                            for (const tray of traysToDelete) {
                                await tx.tray.update({
                                    where: { id: tray.id },
                                    data: { is_deleted: true, deletedAt: new Date(), deletedBy: userId }
                                });
                            }

                            // Update or Create trays
                            for (const tray of sec.trays) {
                                const isNewTray = typeof tray.id !== 'string' || !existingSec.trays.find(t => t.id === tray.id);
                                if (isNewTray) {
                                    await tx.tray.create({
                                        data: { name: tray.name, sectionId: sectionId, createdBy: userId }
                                    });
                                } else {
                                    await tx.tray.update({
                                        where: { id: tray.id },
                                        data: { name: tray.name, updatedBy: userId }
                                    });
                                }
                            }
                        }
                    }
                }
            }
            return updatedBox;
        });

        return { success: true, data: result };
    } catch (error) {
        console.error('Error in updateArea service:', error);
        return { success: false, message: 'An internal server error occurred while updating area.' };
    }
};

export const deleteArea = async (id, deletedBy = null) => {
    try {
        const box = await prisma.area.findUnique({
            where: { id },
            include: { sections: true }
        });
        
        if (!box || area.is_deleted) {
            return { success: false, message: 'Area not found or has already been deleted' };
        }

        const sectionIds = area.sections.map(s => s.id);

        const deletedArea = await prisma.$transaction(async (tx) => {
            const b = await tx.area.update({
                where: { id },
                data: {
                    is_deleted: true,
                    deletedAt: new Date(),
                    deletedBy: deletedBy
                }
            });

            await tx.section.updateMany({
                where: { areaId: id, is_deleted: false },
                data: {
                    is_deleted: true,
                    deletedAt: new Date(),
                    deletedBy: deletedBy
                }
            });

            if (sectionIds.length > 0) {
                await tx.tray.updateMany({
                    where: { sectionId: { in: sectionIds }, is_deleted: false },
                    data: {
                        is_deleted: true,
                        deletedAt: new Date(),
                        deletedBy: deletedBy
                    }
                });
            }

            return b;
        });

        return { success: true, data: deletedArea };
    } catch (error) {
        console.error('Error deleting area:', error);
        return { success: false, message: 'An internal error occurred while deleting the box' };
    }
};
