#!/usr/bin/env node
/**
 * Script to add annotations to all remaining tools in tool.handler.ts
 * This automates the tedious work of adding annotations to 40+ tools
 */

const fs = require('fs');
const path = require('path');

const TOOL_HANDLER_PATH = path.join(__dirname, 'src/handlers/tool.handler.ts');

// Map tool names to their annotation types and titles
const toolAnnotations = {
  // Test tools
  'autotask_test_connection': { type: 'TEST', title: 'Test Connection' },

  // Company tools
  'autotask_search_companies': { type: 'READ_ONLY', title: 'Search Companies' },
  'autotask_create_company': { type: 'CREATE', title: 'Create Company' },
  'autotask_update_company': { type: 'UPDATE', title: 'Update Company' },

  // Contact tools
  'autotask_search_contacts': { type: 'READ_ONLY', title: 'Search Contacts' },
  'autotask_create_contact': { type: 'CREATE', title: 'Create Contact' },

  // Ticket tools
  'autotask_search_tickets': { type: 'READ_ONLY', title: 'Search Tickets' },
  'autotask_get_ticket_details': { type: 'READ_ONLY', title: 'Get Ticket Details' },
  'autotask_create_ticket': { type: 'CREATE', title: 'Create Ticket' },
  'autotask_update_ticket': { type: 'UPDATE', title: 'Update Ticket' },

  // Time entry tools
  'autotask_create_time_entry': { type: 'CREATE', title: 'Create Time Entry' },

  // Project tools
  'autotask_search_projects': { type: 'READ_ONLY', title: 'Search Projects' },
  'autotask_create_project': { type: 'CREATE', title: 'Create Project' },

  // Resource tools
  'autotask_search_resources': { type: 'READ_ONLY', title: 'Search Resources' },

  // Note tools
  'autotask_get_ticket_note': { type: 'READ_ONLY', title: 'Get Ticket Note' },
  'autotask_search_ticket_notes': { type: 'READ_ONLY', title: 'Search Ticket Notes' },
  'autotask_create_ticket_note': { type: 'CREATE', title: 'Create Ticket Note' },
  'autotask_get_project_note': { type: 'READ_ONLY', title: 'Get Project Note' },
  'autotask_search_project_notes': { type: 'READ_ONLY', title: 'Search Project Notes' },
  'autotask_create_project_note': { type: 'CREATE', title: 'Create Project Note' },
  'autotask_get_company_note': { type: 'READ_ONLY', title: 'Get Company Note' },
  'autotask_search_company_notes': { type: 'READ_ONLY', title: 'Search Company Notes' },
  'autotask_create_company_note': { type: 'CREATE', title: 'Create Company Note' },

  // Attachment tools
  'autotask_search_ticket_attachments': { type: 'READ_ONLY', title: 'Search Ticket Attachments' },
  'autotask_get_ticket_attachment': { type: 'READ_ONLY', title: 'Get Ticket Attachment' },

  // Expense report tools
  'autotask_get_expense_report': { type: 'READ_ONLY', title: 'Get Expense Report' },
  'autotask_search_expense_reports': { type: 'READ_ONLY', title: 'Search Expense Reports' },
  'autotask_create_expense_report': { type: 'CREATE', title: 'Create Expense Report' },

  // Quote tools
  'autotask_get_quote': { type: 'READ_ONLY', title: 'Get Quote' },
  'autotask_search_quotes': { type: 'READ_ONLY', title: 'Search Quotes' },
  'autotask_create_quote': { type: 'CREATE', title: 'Create Quote' },

  // Configuration item tools
  'autotask_search_configuration_items': { type: 'READ_ONLY', title: 'Search Configuration Items' },

  // Contract tools
  'autotask_search_contracts': { type: 'READ_ONLY', title: 'Search Contracts' },

  // Invoice tools
  'autotask_search_invoices': { type: 'READ_ONLY', title: 'Search Invoices' },

  // Task tools
  'autotask_search_tasks': { type: 'READ_ONLY', title: 'Search Tasks' },
  'autotask_create_task': { type: 'CREATE', title: 'Create Task' },
};

function addAnnotationToTool(content, toolName, annotationConfig) {
  const { type, title } = annotationConfig;
  const annotationType = `${type}_ANNOTATIONS`;

  // Find the tool definition
  const toolNamePattern = new RegExp(
    `(\\{\\s*name:\\s*"${toolName}",.*?required:\\s*\\[.*?\\],\\s*\\})`,
    'gs'
  );

  const annotationBlock = `$1,
        annotations: {
          title: "${title}",
          ...${annotationType},
        },`;

  return content.replace(toolNamePattern, annotationBlock);
}

function main() {
  console.log('Reading tool.handler.ts...');
  let content = fs.readFileSync(TOOL_HANDLER_PATH, 'utf8');

  console.log('Adding annotations to tools...');
  let modified = 0;

  for (const [toolName, config] of Object.entries(toolAnnotations)) {
    // Check if already has annotations
    const hasAnnotations = new RegExp(`name:\\s*"${toolName}"[\\s\\S]*?annotations:`).test(content);

    if (!hasAnnotations) {
      const beforeLength = content.length;
      content = addAnnotationToTool(content, toolName, config);
      if (content.length !== beforeLength) {
        modified++;
        console.log(`  ✓ Added annotations to ${toolName}`);
      }
    } else {
      console.log(`  - Skipping ${toolName} (already has annotations)`);
    }
  }

  console.log(`\nModified ${modified} tools`);

  if (modified > 0) {
    // Create backup
    const backupPath = TOOL_HANDLER_PATH + '.backup';
    fs.copyFileSync(TOOL_HANDLER_PATH, backupPath);
    console.log(`Created backup at ${backupPath}`);

    // Write updated content
    fs.writeFileSync(TOOL_HANDLER_PATH, content, 'utf8');
    console.log('✓ Updated tool.handler.ts');
  } else {
    console.log('No changes needed');
  }
}

main();
