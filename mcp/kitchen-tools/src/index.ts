import { createInterface } from 'node:readline';
import { resolveActor, setDefaultBusiness } from './identity.js';
import { getInventory, findInventoryItem, setStock, addStock, deductStock } from './tools/inventory.js';
import { createPrepTasks, getPrepTasks } from './tools/prep.js';
import { suggestReorder, createShoppingItem } from './tools/shopping.js';
import { recordWastage } from './tools/wastage.js';

const actorFields = {
  telegram_user_id: { type: 'string', description: 'Telegram numeric user id for the sender.' },
  telegram_username: { type: 'string', description: 'Optional Telegram username for audit logs.' },
};

const businessFields = {
  business_id: { type: 'string', description: 'Optional explicit Smart Kitchen business/store UUID.' },
  business_name: { type: 'string', description: 'Optional store name mentioned by the sender.' },
};

const tools = [
  { name: 'kitchen_resolve_actor', description: 'Resolve a Telegram sender to a linked Supabase user and their accessible stores.', inputSchema: { type: 'object', properties: actorFields, required: ['telegram_user_id'] } },
  { name: 'kitchen_set_default_business', description: 'Set the linked Telegram user default store after validating access.', inputSchema: { type: 'object', properties: { ...actorFields, business_id: { type: 'string' } }, required: ['telegram_user_id', 'business_id'] } },
  { name: 'kitchen_get_inventory', description: 'Read inventory_items for an accessible store.', inputSchema: { type: 'object', properties: { ...actorFields, ...businessFields }, required: ['telegram_user_id'] } },
  { name: 'kitchen_find_inventory_item', description: 'Find the best inventory_items match for an item name in an accessible store.', inputSchema: { type: 'object', properties: { ...actorFields, ...businessFields, item_name: { type: 'string' } }, required: ['telegram_user_id', 'item_name'] } },
  { name: 'kitchen_set_stock', description: 'Set/overwrite stock quantity for stocktake phrases such as "only left" or "只剩".', inputSchema: { type: 'object', properties: { ...actorFields, ...businessFields, item_name: { type: 'string' }, quantity: { type: 'number' }, unit: { type: 'string' }, reason: { type: 'string' } }, required: ['telegram_user_id', 'item_name', 'quantity'] } },
  { name: 'kitchen_add_stock', description: 'Add received/delivered quantity to current stock.', inputSchema: { type: 'object', properties: { ...actorFields, ...businessFields, item_name: { type: 'string' }, quantity: { type: 'number' }, unit: { type: 'string' }, reason: { type: 'string' } }, required: ['telegram_user_id', 'item_name', 'quantity'] } },
  { name: 'kitchen_deduct_stock', description: 'Deduct consumed/used quantity from current stock.', inputSchema: { type: 'object', properties: { ...actorFields, ...businessFields, item_name: { type: 'string' }, quantity: { type: 'number' }, unit: { type: 'string' }, reason: { type: 'string' } }, required: ['telegram_user_id', 'item_name', 'quantity'] } },
  { name: 'kitchen_create_prep_tasks', description: 'Create prep_tasks for a target store and task date.', inputSchema: { type: 'object', properties: { ...actorFields, ...businessFields, task_date: { type: 'string' }, tasks: { type: 'array', items: { type: 'object', properties: { task_text: { type: 'string' }, assigned_to: { type: 'string' }, priority: { type: 'number' } }, required: ['task_text'] } } }, required: ['telegram_user_id', 'task_date', 'tasks'] } },
  { name: 'kitchen_get_prep_tasks', description: 'Read prep_tasks for a target store and optional date.', inputSchema: { type: 'object', properties: { ...actorFields, ...businessFields, task_date: { type: 'string' } }, required: ['telegram_user_id'] } },
  { name: 'kitchen_suggest_reorder', description: 'Suggest low-stock reorders using inventory_items.min_stock_level.', inputSchema: { type: 'object', properties: { ...actorFields, ...businessFields }, required: ['telegram_user_id'] } },
  { name: 'kitchen_create_shopping_item', description: 'Create a pending shopping_list item for an accessible store.', inputSchema: { type: 'object', properties: { ...actorFields, ...businessFields, item_name: { type: 'string' }, quantity_needed: { type: 'number' }, unit: { type: 'string' }, reason: { type: 'string', enum: ['low_stock', 'expiring', 'prep_required', 'manual'] }, priority: { type: 'string', enum: ['urgent', 'normal', 'low'] }, inventory_item_id: { type: 'string' }, category: { type: 'string' }, notes: { type: 'string' } }, required: ['telegram_user_id', 'item_name', 'quantity_needed'] } },
  { name: 'kitchen_record_wastage', description: 'Record wastage_records entry and deduct matching inventory stock.', inputSchema: { type: 'object', properties: { ...actorFields, ...businessFields, item_name: { type: 'string' }, quantity: { type: 'number' }, unit: { type: 'string' }, reason: { type: 'string', enum: ['expired', 'damaged', 'spoiled', 'preparation', 'other'] }, notes: { type: 'string' } }, required: ['telegram_user_id', 'item_name', 'quantity', 'reason'] } },
];

async function callTool(name: string, args: any) {
  switch (name) {
    case 'kitchen_resolve_actor': return resolveActor(args);
    case 'kitchen_set_default_business': return setDefaultBusiness(args);
    case 'kitchen_get_inventory': return getInventory(args);
    case 'kitchen_find_inventory_item': return findInventoryItem(args);
    case 'kitchen_set_stock': return setStock(args);
    case 'kitchen_add_stock': return addStock(args);
    case 'kitchen_deduct_stock': return deductStock(args);
    case 'kitchen_create_prep_tasks': return createPrepTasks(args);
    case 'kitchen_get_prep_tasks': return getPrepTasks(args);
    case 'kitchen_suggest_reorder': return suggestReorder(args);
    case 'kitchen_create_shopping_item': return createShoppingItem(args);
    case 'kitchen_record_wastage': return recordWastage(args);
    default: throw new Error(`Unknown kitchen tool: ${name}`);
  }
}

function writeResponse(response: unknown) {
  process.stdout.write(`${JSON.stringify(response)}\n`);
}

const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });

rl.on('line', async line => {
  if (!line.trim()) return;

  let request: any;
  try {
    request = JSON.parse(line);
  } catch (error: any) {
    writeResponse({ jsonrpc: '2.0', id: null, error: { code: -32700, message: error.message } });
    return;
  }

  try {
    if (request.method === 'initialize') {
      writeResponse({
        jsonrpc: '2.0',
        id: request.id,
        result: {
          protocolVersion: request.params?.protocolVersion || '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'smart-kitchen-kitchen-tools', version: '0.1.0' },
        },
      });
      return;
    }

    if (request.method === 'notifications/initialized') return;

    if (request.method === 'tools/list') {
      writeResponse({ jsonrpc: '2.0', id: request.id, result: { tools } });
      return;
    }

    if (request.method === 'tools/call') {
      const result = await callTool(request.params?.name, request.params?.arguments || {});
      writeResponse({
        jsonrpc: '2.0',
        id: request.id,
        result: { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] },
      });
      return;
    }

    writeResponse({ jsonrpc: '2.0', id: request.id, error: { code: -32601, message: `Method not found: ${request.method}` } });
  } catch (error: any) {
    writeResponse({ jsonrpc: '2.0', id: request.id, error: { code: -32000, message: error.message } });
  }
});
