import { listAccessibleBusinesses, resolveActor, setDefaultBusiness } from './identity.js';
import { getInventory, findInventoryItem, setStock, addStock, deductStock } from './tools/inventory.js';
import { createPrepTasks, getPrepTasks } from './tools/prep.js';
import { suggestReorder, createShoppingItem } from './tools/shopping.js';
import { recordWastage } from './tools/wastage.js';
import { redeemTelegramLinkCode } from './linkCodes.js';
import { supabase } from './supabase.js';
import { importTelegramReceiptItems } from './tools/receipts.js';
import { searchTelegramKnowledgeItems, upsertTelegramKnowledgeItem } from './tools/knowledge.js';

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
  { name: 'kitchen_link_telegram_code', description: 'Redeem a short-lived Smart Kitchen web link code sent as /link CODE from Telegram.', inputSchema: { type: 'object', properties: { ...actorFields, code: { type: 'string', description: 'One-time code generated in the Smart Kitchen web app, such as SK-482913.' } }, required: ['telegram_user_id', 'code'] } },
  { name: 'kitchen_list_businesses', description: 'List all Smart Kitchen stores this linked Telegram user can access, including per-store role and current default store.', inputSchema: { type: 'object', properties: actorFields, required: ['telegram_user_id'] } },
  { name: 'kitchen_set_default_business', description: 'Set the linked Telegram user default store by store UUID or store name after validating access. Use for /store STORE_NAME or when the sender asks to switch stores.', inputSchema: { type: 'object', properties: { ...actorFields, ...businessFields }, required: ['telegram_user_id'] } },
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
  { name: 'kitchen_import_receipt_items', description: 'Apply parsed Telegram receipt/invoice lines to inventory_items and record a receipt import log.', inputSchema: { type: 'object', properties: { ...actorFields, ...businessFields, supplier: { type: 'string' }, receipt_date: { type: 'string' }, raw_text: { type: 'string' }, items: { type: 'array', items: { type: 'object', properties: { item_name: { type: 'string' }, quantity: { type: 'number' }, unit: { type: 'string' }, total_price: { type: 'number' }, category: { type: 'string' }, expiry_date: { type: 'string' } }, required: ['item_name', 'quantity'] } } }, required: ['telegram_user_id', 'items'] } },
  { name: 'kitchen_upsert_knowledge_item', description: 'Create or update a Kitchen Wiki item, aliases, default unit/location, par level, and shelf-life rules.', inputSchema: { type: 'object', properties: { ...actorFields, ...businessFields, canonical_name: { type: 'string' }, aliases: { type: 'array', items: { type: 'string' } }, category: { type: 'string' }, default_location: { type: 'string' }, default_unit: { type: 'string' }, par_level: { type: 'number' }, shelf_life_days: { type: 'number' }, notes: { type: 'string' } }, required: ['telegram_user_id', 'canonical_name'] } },
  { name: 'kitchen_search_knowledge', description: 'Search Kitchen Wiki items and aliases for an accessible store.', inputSchema: { type: 'object', properties: { ...actorFields, ...businessFields, query: { type: 'string' }, limit: { type: 'number' } }, required: ['telegram_user_id'] } },
];

async function callTool(name: string, args: any) {
  switch (name) {
    case 'kitchen_resolve_actor': return resolveActor(args);
    case 'kitchen_link_telegram_code': return redeemTelegramLinkCode(supabase, args);
    case 'kitchen_list_businesses': return listAccessibleBusinesses(args);
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
    case 'kitchen_import_receipt_items': return importTelegramReceiptItems(args);
    case 'kitchen_upsert_knowledge_item': return upsertTelegramKnowledgeItem(args);
    case 'kitchen_search_knowledge': return searchTelegramKnowledgeItems(args);
    default: throw new Error(`Unknown kitchen tool: ${name}`);
  }
}

let outputMode: 'framed' | 'line' = 'line';

function writeResponse(response: unknown) {
  const payload = JSON.stringify(response);
  if (outputMode === 'framed') {
    process.stdout.write(`Content-Length: ${Buffer.byteLength(payload, 'utf8')}\r\n\r\n${payload}`);
    return;
  }
  process.stdout.write(`${payload}\n`);
}

async function handleRequestLine(line: string) {
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
}

let lineBuffer = '';
let frameBuffer = Buffer.alloc(0);

function handleLineChunk(chunk: Buffer) {
  lineBuffer += chunk.toString('utf8');
  let newlineIndex = lineBuffer.indexOf('\n');

  while (newlineIndex >= 0) {
    const line = lineBuffer.slice(0, newlineIndex).replace(/\r$/, '');
    lineBuffer = lineBuffer.slice(newlineIndex + 1);
    void handleRequestLine(line);
    newlineIndex = lineBuffer.indexOf('\n');
  }
}

function handleFramedChunk(chunk: Buffer) {
  frameBuffer = Buffer.concat([frameBuffer, chunk]);

  while (true) {
    const crlfHeaderEnd = frameBuffer.indexOf('\r\n\r\n');
    const lfHeaderEnd = frameBuffer.indexOf('\n\n');
    const hasCrlfHeader = crlfHeaderEnd >= 0;
    const hasLfHeader = lfHeaderEnd >= 0;
    if (!hasCrlfHeader && !hasLfHeader) return;

    const useCrlfHeader = hasCrlfHeader && (!hasLfHeader || crlfHeaderEnd <= lfHeaderEnd);
    const headerEnd = useCrlfHeader ? crlfHeaderEnd : lfHeaderEnd;
    const bodyStart = headerEnd + (useCrlfHeader ? 4 : 2);

    const header = frameBuffer.slice(0, headerEnd).toString('ascii');
    const lengthMatch = header.match(/(?:^|\r?\n)Content-Length:\s*(\d+)/i);

    if (!lengthMatch) {
      writeResponse({ jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Missing Content-Length header' } });
      frameBuffer = Buffer.alloc(0);
      return;
    }

    const contentLength = Number(lengthMatch[1]);
    const bodyEnd = bodyStart + contentLength;
    if (frameBuffer.length < bodyEnd) return;

    const body = frameBuffer.slice(bodyStart, bodyEnd).toString('utf8');
    frameBuffer = frameBuffer.slice(bodyEnd);
    void handleRequestLine(body);
  }
}

process.stdin.on('data', chunk => {
  if (outputMode === 'line') {
    const preview = chunk.toString('ascii', 0, Math.min(chunk.length, 32));
    if (preview.startsWith('Content-Length:')) {
      outputMode = 'framed';
    }
  }

  if (outputMode === 'framed') {
    handleFramedChunk(chunk);
    return;
  }

  handleLineChunk(chunk);
});
