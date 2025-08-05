# 🧠 Project Overview: reg.ulate.ai

## 🎯 Goal
A label verification and inspection system for regulated products (food, chemical, etc.) that combines visual parsing, AI validation, and collaborative issue resolution—all mapped directly onto the product label.

---

## 🧱 Core Functional Components

### 1. Label Upload & Initialization
Users can upload:
- Label images or PDFs (front/back)
- SDS files
- Ingredient/Chemical lists (CSV/JSON)
- Regulatory guidelines (API, static, or linked)
- Optionally fetch related files from SharePoint or folders

### 2. Label Parsing & Segmentation
- Use OCR and layout analysis to detect and classify label components (e.g., nutrition panels, warnings)
- Assign bounding boxes and metadata
- Store components in a project-specific database

### 3. Agent-Based Validation System
- Each component is validated by a specialized "agent"
- Agents apply rules, heuristics, and learned logic using:
  - Internal company info
  - Regulatory sources (FDA, GHS, CFRA, OSHA, EPA)
  - Past label artifacts

### 4. Red Dot Visual QA
- Each flagged issue appears as a red dot on the label
- Click opens a card with:
  - Context, validator notes, team comments, approval tracking, and fix suggestions

### 5. Task-Based Workflow
- Each red dot = a task card with:
  - Assignee, comments, approval trail, revision history
  - Status: Open → Investigating → Revised → Approved

### 6. Progress Tracking
- Global status indicator (bar or traffic light)
- Tracks % reviewed, % approved, unresolved issues
- Goal: full "Green Check" status = complete validation

---

## 📊 Data Model Overview

| Entity           | Key Fields                                      |
|------------------|-------------------------------------------------|
| LabelProject     | name, upload_date, client_id, status            |
| LabelComponent   | label_id, type, bounding_box, extracted_text    |
| ValidatorAgent   | name, type, source_rules, logic_module          |
| ValidationIssue  | component_id, validator_id, issue_type, severity, notes |
| IssueCard        | issue_id, assignee, status, comments, revisions |

---

## 👥 Descriptive Angles

### For Clients / Regulatory Teams
> A collaborative QA platform that automates regulatory label review and enables visual annotation, validation, and approval workflows mapped directly to your product packaging.

### For Tech / Product Teams
> An AI-powered annotation and task engine for label QA—decomposes a label into components, assigns validators, and manages feedback in a structured workflow.

### For Legal / Compliance Teams
> Turns static label review into a traceable, auditable, approval-driven process with rule-based and learning-based validation systems.

---

## 🔄 User Flow Summary

1. **Upload**: Label, SDS, ingredient list, guidelines  
2. **Parse & Segment**: OCR + layout detection  
3. **Validate**: Trigger validators per component  
4. **Flag**: Visual red dots for noncompliance  
5. **Review**: Task cards with comments & approvals  
6. **Iterate**: Team proposes & tracks revisions  
7. **Complete**: 100% validation → Green Check

---

## 🚀 Next Steps (Optional)

- [ ] UX Wireframes: Red dot UI, card panel, validation summary  
- [ ] MVP Feature Split: Phase 1 vs Phase 2  
- [ ] Schema Draft: SQL/NoSQL models  
- [ ] Architecture: Agent-based microservices, label parser, UI  
- [ ] Toolchain: Tesseract, LayoutLM, LangChain  
- [ ] Integrations: SharePoint, FDA, CFRA, SDS APIs

