import dbConnect from '@/lib/dbConnect';
import Automation from '@/models/Automation';
import Lead from '@/models/Lead';
import CrmTask from '@/models/CrmTask';
import MessageTemplate from '@/models/MessageTemplate';

/**
 * Run automations for a specific trigger type
 * @param {string} triggerType - The trigger type (lead_created, lead_status_change, etc.)
 * @param {Object} context - Context data (lead, user, etc.)
 */
export async function runAutomations(triggerType, context) {
  try {
    await dbConnect();
    
    const { tenantId, lead, user, previousStatus, newStatus } = context;
    
    // Find active automations for this trigger
    const automations = await Automation.find({
      tenantId,
      isActive: true,
      'trigger.type': triggerType,
    }).populate('action.templateId');

    for (const automation of automations) {
      try {
        // Check conditions
        if (!checkConditions(automation.trigger.conditions, context)) {
          continue;
        }

        // Schedule or execute action
        if (automation.delayMinutes > 0) {
          // In production, use a job queue like Bull or Agenda
          // For now, we'll use setTimeout (not ideal for production)
          setTimeout(() => {
            executeAction(automation, context);
          }, automation.delayMinutes * 60 * 1000);
        } else {
          await executeAction(automation, context);
        }

        // Update execution count
        await Automation.findByIdAndUpdate(automation._id, {
          $inc: { executionCount: 1 },
          lastExecutedAt: new Date(),
        });

      } catch (err) {
        console.error(`Error running automation ${automation.name}:`, err);
      }
    }
  } catch (error) {
    console.error('Error in runAutomations:', error);
  }
}

function checkConditions(conditions, context) {
  if (!conditions) return true;
  
  const { lead, previousStatus, newStatus } = context;
  
  if (conditions.status && lead?.status !== conditions.status) {
    return false;
  }
  
  if (conditions.pipelineStage && lead?.pipelineStage !== conditions.pipelineStage) {
    return false;
  }
  
  if (conditions.segment && lead?.segment !== conditions.segment) {
    return false;
  }
  
  return true;
}

async function executeAction(automation, context) {
  const { action } = automation;
  const { lead, tenantId, user } = context;

  switch (action.type) {
    case 'create_task':
      await CrmTask.create({
        tenantId,
        title: action.taskTitle || `מעקב: ${lead?.name}`,
        type: action.taskType || 'follow_up',
        status: 'pending',
        priority: 'normal',
        leadId: lead?._id,
        assignedTo: action.assignTo || user?._id,
        dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        createdBy: user?._id,
      });
      break;

    case 'update_lead':
      if (lead && action.updateFields) {
        await Lead.findByIdAndUpdate(lead._id, action.updateFields);
      }
      break;

    case 'send_message':
      // Prepare message from template
      if (action.templateId) {
        const template = action.templateId;
        let content = template.content;
        
        // Replace variables
        if (lead) {
          content = content
            .replace(/\{\{name\}\}/g, lead.name || '')
            .replace(/\{\{phone\}\}/g, lead.phone || '')
            .replace(/\{\{email\}\}/g, lead.email || '');
        }

        // Log the message (in production, send via WhatsApp/Email)
        console.log(`[Automation] Send message to ${lead?.phone}: ${content}`);
        
        // Update template usage count
        await MessageTemplate.findByIdAndUpdate(template._id, {
          $inc: { usageCount: 1 },
        });
      }
      break;

    case 'notify_user':
      // In production, send notification via email/push
      console.log(`[Automation] Notify user about lead: ${lead?.name}`);
      break;

    case 'webhook':
      if (action.webhookUrl) {
        try {
          await fetch(action.webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              event: automation.trigger.type,
              lead,
              timestamp: new Date().toISOString(),
            }),
          });
        } catch (err) {
          console.error('Webhook error:', err);
        }
      }
      break;
  }
}

/**
 * Check for leads without contact and trigger automations
 */
export async function checkNoContactLeads() {
  try {
    await dbConnect();
    
    const automations = await Automation.find({
      isActive: true,
      'trigger.type': 'no_contact',
    });

    for (const automation of automations) {
      const daysWithoutContact = automation.trigger.conditions?.daysWithoutContact || 3;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysWithoutContact);

      const leads = await Lead.find({
        tenantId: automation.tenantId,
        status: { $nin: ['converted', 'lost'] },
        $or: [
          { lastContactAt: { $lt: cutoffDate } },
          { lastContactAt: { $exists: false }, createdAt: { $lt: cutoffDate } },
        ],
      });

      for (const lead of leads) {
        await executeAction(automation, {
          tenantId: automation.tenantId,
          lead,
        });
      }
    }
  } catch (error) {
    console.error('Error checking no-contact leads:', error);
  }
}
