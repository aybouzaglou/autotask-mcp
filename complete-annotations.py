#!/usr/bin/env python3
"""
Complete Tool Annotations Script
Systematically adds annotations to all remaining tools in tool.handler.ts
"""

import re
from pathlib import Path

# Tool name to annotation mapping
TOOL_ANNOTATIONS = {
    # Already completed
    "autotask_test_connection": ("TEST_ANNOTATIONS", "Test Connection"),
    "autotask_search_companies": ("READ_ONLY_ANNOTATIONS", "Search Companies"),
    "autotask_create_company": ("CREATE_ANNOTATIONS", "Create Company"),
    "autotask_update_company": ("UPDATE_ANNOTATIONS", "Update Company"),
    "autotask_search_contacts": ("READ_ONLY_ANNOTATIONS", "Search Contacts"),
    "autotask_create_contact": ("CREATE_ANNOTATIONS", "Create Contact"),

    # Ticket tools
    "autotask_search_tickets": ("READ_ONLY_ANNOTATIONS", "Search Tickets"),
    "autotask_get_ticket_details": ("READ_ONLY_ANNOTATIONS", "Get Ticket Details"),
    "autotask_create_ticket": ("CREATE_ANNOTATIONS", "Create Ticket"),
    "autotask_update_ticket": ("UPDATE_ANNOTATIONS", "Update Ticket"),

    # Time entry tools
    "autotask_create_time_entry": ("CREATE_ANNOTATIONS", "Create Time Entry"),

    # Project tools
    "autotask_search_projects": ("READ_ONLY_ANNOTATIONS", "Search Projects"),
    "autotask_create_project": ("CREATE_ANNOTATIONS", "Create Project"),

    # Resource tools
    "autotask_search_resources": ("READ_ONLY_ANNOTATIONS", "Search Resources"),

    # Note tools
    "autotask_get_ticket_note": ("READ_ONLY_ANNOTATIONS", "Get Ticket Note"),
    "autotask_search_ticket_notes": ("READ_ONLY_ANNOTATIONS", "Search Ticket Notes"),
    "autotask_create_ticket_note": ("CREATE_ANNOTATIONS", "Create Ticket Note"),
    "autotask_get_project_note": ("READ_ONLY_ANNOTATIONS", "Get Project Note"),
    "autotask_search_project_notes": ("READ_ONLY_ANNOTATIONS", "Search Project Notes"),
    "autotask_create_project_note": ("CREATE_ANNOTATIONS", "Create Project Note"),
    "autotask_get_company_note": ("READ_ONLY_ANNOTATIONS", "Get Company Note"),
    "autotask_search_company_notes": ("READ_ONLY_ANNOTATIONS", "Search Company Notes"),
    "autotask_create_company_note": ("CREATE_ANNOTATIONS", "Create Company Note"),

    # Attachment tools
    "autotask_search_ticket_attachments": ("READ_ONLY_ANNOTATIONS", "Search Ticket Attachments"),
    "autotask_get_ticket_attachment": ("READ_ONLY_ANNOTATIONS", "Get Ticket Attachment"),

    # Expense report tools
    "autotask_get_expense_report": ("READ_ONLY_ANNOTATIONS", "Get Expense Report"),
    "autotask_search_expense_reports": ("READ_ONLY_ANNOTATIONS", "Search Expense Reports"),
    "autotask_create_expense_report": ("CREATE_ANNOTATIONS", "Create Expense Report"),

    # Quote tools
    "autotask_get_quote": ("READ_ONLY_ANNOTATIONS", "Get Quote"),
    "autotask_search_quotes": ("READ_ONLY_ANNOTATIONS", "Search Quotes"),
    "autotask_create_quote": ("CREATE_ANNOTATIONS", "Create Quote"),

    # Configuration item tools
    "autotask_search_configuration_items": ("READ_ONLY_ANNOTATIONS", "Search Configuration Items"),

    # Contract tools
    "autotask_search_contracts": ("READ_ONLY_ANNOTATIONS", "Search Contracts"),

    # Invoice tools
    "autotask_search_invoices": ("READ_ONLY_ANNOTATIONS", "Search Invoices"),

    # Task tools
    "autotask_search_tasks": ("READ_ONLY_ANNOTATIONS", "Search Tasks"),
    "autotask_create_task": ("CREATE_ANNOTATIONS", "Create Task"),
}

def find_tool_definition_end(content, start_pos):
    """Find the closing brace of a tool definition"""
    brace_count = 0
    in_tool = False
    i = start_pos

    while i < len(content):
        if content[i] == '{':
            brace_count += 1
            in_tool = True
        elif content[i] == '}':
            brace_count -= 1
            if in_tool and brace_count == 0:
                return i
        i += 1

    return -1

def add_annotation_to_tool(content, tool_name, annotation_type, title):
    """Add annotation block to a specific tool if not already present"""

    # Check if tool already has annotations
    tool_pattern = rf'name:\s*"{re.escape(tool_name)}"'
    match = re.search(tool_pattern, content)

    if not match:
        return content, False

    tool_start = match.start()

    # Check if already has annotations
    next_500_chars = content[tool_start:tool_start + 1000]
    if 'annotations:' in next_500_chars:
        return content, False

    # Find the end of required array
    required_pattern = r'required:\s*\[([^\]]*)\]'
    required_match = re.search(required_pattern, content[tool_start:tool_start + 2000])

    if not required_match:
        return content, False

    # Find position after the required array's closing bracket
    insert_pos = tool_start + required_match.end()

    # Find the next comma or closing brace
    next_chars = content[insert_pos:insert_pos + 50]
    comma_match = re.search(r',\s*\}', next_chars)

    if not comma_match:
        return content, False

    # Insert annotation before the closing brace
    actual_insert_pos = insert_pos + comma_match.start() + 1  # After the comma

    annotation_block = f""",
        annotations: {{
          title: "{title}",
          ...{annotation_type},
        }}"""

    new_content = content[:actual_insert_pos] + annotation_block + content[actual_insert_pos:]

    return new_content, True

def main():
    handler_path = Path(__file__).parent / "src" / "handlers" / "tool.handler.ts"

    if not handler_path.exists():
        print(f"Error: Could not find {handler_path}")
        return 1

    print(f"Reading {handler_path}...")
    content = handler_path.read_text()

    # Create backup
    backup_path = handler_path.with_suffix('.ts.backup-annotations')
    backup_path.write_text(content)
    print(f"Created backup at {backup_path}")

    modified_count = 0
    skipped_count = 0

    for tool_name, (annotation_type, title) in TOOL_ANNOTATIONS.items():
        new_content, modified = add_annotation_to_tool(content, tool_name, annotation_type, title)

        if modified:
            content = new_content
            modified_count += 1
            print(f"  ✓ Added annotations to {tool_name}")
        else:
            skipped_count += 1
            print(f"  - Skipped {tool_name} (already has annotations or not found)")

    if modified_count > 0:
        handler_path.write_text(content)
        print(f"\n✓ Successfully added annotations to {modified_count} tools")
        print(f"  ({skipped_count} tools skipped)")
    else:
        print("\nNo changes needed - all tools already have annotations")

    return 0

if __name__ == "__main__":
    exit(main())
