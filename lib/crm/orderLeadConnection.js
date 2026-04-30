import dbConnect from '@/lib/dbConnect';
import Lead from '@/models/Lead';
import Order from '@/models/Order';

/**
 * Connect an order to a lead based on phone or email match
 * @param {Object} order - The order object
 * @returns {Object|null} - The matched lead or null
 */
export async function connectOrderToLead(order) {
  try {
    await dbConnect();
    
    const { phone, email, customerId, tenantId } = order;
    
    if (!phone && !email) {
      return null;
    }

    // Find matching lead
    const query = {
      tenantId,
      status: { $ne: 'converted' },
      $or: [],
    };

    if (phone) {
      // Normalize phone for matching
      const normalizedPhone = phone.replace(/\D/g, '').slice(-9);
      query.$or.push({ phone: { $regex: normalizedPhone } });
    }

    if (email) {
      query.$or.push({ email: email.toLowerCase() });
    }

    if (query.$or.length === 0) {
      return null;
    }

    const lead = await Lead.findOne(query);

    if (lead) {
      // Update lead to converted
      await Lead.findByIdAndUpdate(lead._id, {
        status: 'converted',
        pipelineStage: 'won',
        convertedToCustomer: true,
        customerId: customerId,
        convertedAt: new Date(),
      });

      // Update order with lead reference
      await Order.findByIdAndUpdate(order._id, {
        leadId: lead._id,
        source: lead.source,
        agentId: lead.agentId,
      });

      return lead;
    }

    return null;
  } catch (error) {
    console.error('Error connecting order to lead:', error);
    return null;
  }
}

/**
 * Get orders associated with a lead
 * @param {string} leadId - The lead ID
 * @returns {Array} - Orders array
 */
export async function getLeadOrders(leadId) {
  try {
    await dbConnect();
    
    const lead = await Lead.findById(leadId);
    if (!lead) return [];

    // Find orders by customer ID or phone match
    const query = {
      $or: [
        { leadId: leadId },
      ],
    };

    if (lead.customerId) {
      query.$or.push({ customer: lead.customerId });
    }

    if (lead.phone) {
      const normalizedPhone = lead.phone.replace(/\D/g, '').slice(-9);
      query.$or.push({ 'customerPhone': { $regex: normalizedPhone } });
    }

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    return orders;
  } catch (error) {
    console.error('Error getting lead orders:', error);
    return [];
  }
}

/**
 * Calculate lead value from orders
 * @param {string} leadId - The lead ID
 * @returns {Object} - Value stats
 */
export async function calculateLeadValue(leadId) {
  try {
    const orders = await getLeadOrders(leadId);
    
    const stats = {
      totalOrders: orders.length,
      totalValue: 0,
      averageOrderValue: 0,
      lastOrderDate: null,
    };

    if (orders.length > 0) {
      stats.totalValue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
      stats.averageOrderValue = stats.totalValue / orders.length;
      stats.lastOrderDate = orders[0].createdAt;
    }

    return stats;
  } catch (error) {
    console.error('Error calculating lead value:', error);
    return null;
  }
}
