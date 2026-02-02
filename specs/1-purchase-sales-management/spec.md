# Feature Specification: Purchase, Sales, and Cost Management System

**Feature Branch**: `1-purchase-sales-management`
**Created**: 2026-01-04
**Status**: Draft
**Input**: User description: "매입, 판매, 원가를 관리하는 시스템을 만들고 싶습니다. 재고 관리와 손익 계산 기능이 필요합니다. 매입*판매*원가.xlsx 이 엑셀 파일을 분석해서 동일한 역할을 하는 온라인 프로그램을 만들고 샆어. 매입 입력화면을 통해 입력 받으면 이력을 누적해서 보여주는 페이지와 일일 판매량을 입력 받으면 마찬가지로 누적 관리하는 페이지, 그리고 판매 원가 및 마진율등을 분석하는 페이지를 만들고 싶어. 반응형이어야 해"

## Overview

This system replaces an existing Excel-based workflow for managing purchases, sales, and cost analysis for a fried chicken restaurant business. The system will digitize the current manual tracking process, providing web-based data entry, cumulative history tracking, and automated cost/margin analysis. The solution must work on all devices (desktop, tablet, mobile) to support on-site business operations.

## User Scenarios & Testing _(mandatory)_

### User Story 1 - Record Purchase Transactions (Priority: P1)

A business operator needs to record incoming purchases of raw materials and supplies as they arrive. Each purchase includes the date, menu category, ingredient name, supplier, quantity, unit price, and total amount. The system should validate that the menu and ingredient combination exists in the master data.

**Why this priority**: This is the foundation of inventory and cost tracking. Without purchase records, no cost analysis or margin calculations are possible. This represents the primary data input for the entire system.

**Independent Test**: Can be fully tested by entering a purchase transaction with valid menu/ingredient combinations and verifying it appears in the purchase history with calculated totals and validation status.

**Acceptance Scenarios**:

1. **Given** the purchase entry form is displayed, **When** the operator enters date, menu "양념치킨", ingredient "냉동 닭다리살", supplier "홍성냉동", quantity "2", and unit price "42500", **Then** the system calculates total amount as "85000" and marks validation as "OK"
2. **Given** the purchase entry form is displayed, **When** the operator enters a menu/ingredient combination that doesn't exist in the master list, **Then** the system marks the entry with a validation warning "부적합"
3. **Given** multiple purchase entries exist, **When** the operator views the purchase history page, **Then** all transactions are displayed in chronological order with date, menu, ingredient, supplier, quantity, unit price, total amount, and validation status

---

### User Story 2 - Record Daily Sales Quantities (Priority: P1)

A business operator needs to record daily sales quantities for each product SKU (sales unit). Products are sold in different forms that require conversion to raw ingredient equivalents (e.g., "양념치킨*봉" = 1 whole chicken = 95g equivalent, "양념치킨*박스(대)" = 2.84 chickens = 270g). The system should track cumulative sales over time.

**Why this priority**: Sales data is essential for calculating cost of goods sold (COGS) and profit margins. This is the second critical data input alongside purchases. Together with P1, it enables basic cost analysis.

**Independent Test**: Can be fully tested by entering daily sales quantities for various SKUs, verifying the system stores them with correct dates, and viewing cumulative sales history showing all entries.

**Acceptance Scenarios**:

1. **Given** the daily sales entry form is displayed, **When** the operator enters date "2025-12-01" with "양념치킨*봉: 15", "양념치킨*박스(대): 5", and "만두\_봉: 20", **Then** the system records these quantities for the specified date
2. **Given** sales entries exist for multiple dates, **When** the operator views the sales history page, **Then** all daily entries are displayed in chronological order showing date and quantities for each SKU
3. **Given** a SKU with conversion factor exists (e.g., "양념치킨\_박스(대)" = 2.84), **When** the operator enters sales quantity "5", **Then** the system internally tracks both the unit quantity (5 boxes) and the equivalent ingredient quantity (14.2 chickens) for cost calculation

---

### User Story 3 - View Period-Based Cost and Margin Analysis (Priority: P2)

A business operator needs to analyze costs and margins for a specified date range. The system should calculate total purchase costs by menu category, allocate costs to sales based on predefined distribution percentages, compute total allocated costs, and display margin analysis showing cost of goods sold and profit margins.

**Why this priority**: This provides the core business intelligence value. While data entry (P1 stories) is essential for capturing information, this analysis transforms that data into actionable business insights about profitability and cost management.

**Independent Test**: Can be fully tested by entering a start date and end date, verifying the system displays purchase cost summary by menu, shows cost allocation based on distribution percentages, and calculates margins with percentage values.

**Acceptance Scenarios**:

1. **Given** purchase and sales data exists for December 2025, **When** the operator selects period "2025-12-01" to "2025-12-31", **Then** the system displays total purchase costs grouped by menu category (e.g., "양념치킨", "순살치킨", "파닭치킨")
2. **Given** the period analysis is displayed, **When** the system calculates cost allocation, **Then** it applies the predefined distribution percentages (e.g., "양념치킨": 40%, "순살치킨": 25%, "파닭치킨": 20%) to allocate purchase costs proportionally
3. **Given** cost allocation is complete, **When** the system displays margin analysis, **Then** it shows for each menu: allocated cost amount, margin percentage calculated from (sales revenue - allocated cost) / sales revenue, and profit/loss amount
4. **Given** the distribution percentages sum to 100%, **When** the operator views the cost allocation table, **Then** the system validates and displays the total percentage as "100%" with individual menu percentages

---

### User Story 4 - Manage Menu and Ingredient Master Data (Priority: P3)

A business operator needs to maintain reference lists of menu categories, ingredients, and their relationships. This includes defining which ingredients are used in which menu items, setting up product SKU conversion factors for sales tracking, and managing SKU selling prices for revenue calculation.

**Why this priority**: Master data management is important for data quality and validation, but the system can function with a static initial dataset. This becomes more critical as the business evolves and adds new menu items or changes suppliers.

**Independent Test**: Can be fully tested by adding a new menu category and associated ingredients, then verifying that purchase entry validation and sales conversion factors work correctly with the new data.

**Acceptance Scenarios**:

1. **Given** the menu management page is displayed, **When** the operator adds a new menu "신메뉴" with ingredients "재료A", "재료B", "재료C", **Then** these become available for purchase entry validation
2. **Given** the SKU management page exists, **When** the operator defines "신메뉴\_봉" with conversion factor "1.5" and selling price "15,000원", **Then** sales entries for this SKU automatically convert quantities using this factor and calculate revenue using the price
3. **Given** master data changes are made, **When** the operator attempts to enter a purchase or sale, **Then** the system validates against the current master data immediately
4. **Given** SKU prices are defined, **When** the operator enters sales quantities, **Then** the system automatically calculates daily revenue as sum of (quantity × price) for all SKUs

---

### Edge Cases

- What happens when a purchase entry has a menu/ingredient combination that was previously valid but has been removed from the master data? (System should maintain historical data integrity but flag it for review)
- How does the system handle negative quantities or prices in purchase entries? (System should validate that quantities and prices are positive numbers, allow negative amounts for returns/refunds if marked explicitly)
- What happens when distribution percentages for cost allocation don't sum to exactly 100%? (System should alert the operator and prevent calculation until corrected)
- How does the system handle leap years or month-end dates in period analysis? (Date range selection should support all valid calendar dates without calculation errors)
- What happens when sales are recorded for a date that has no purchase data? (System should allow the entry but may show incomplete margin analysis or estimated costs)
- How does the system handle very large quantities that exceed storage limits (e.g., 999,999+)? (System should define reasonable maximum values based on business scale and validate inputs)

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: System MUST provide a purchase entry form accepting date, menu category, ingredient name, supplier, quantity, unit price, and unit description
- **FR-002**: System MUST automatically calculate total purchase amount as quantity × unit price
- **FR-003**: System MUST validate each purchase entry against the menu-ingredient master list and display validation status ("OK" or "부적합")
- **FR-004**: System MUST display purchase transaction history showing all entries in chronological order with all input fields and calculated values
- **FR-005**: System MUST provide a daily sales entry form accepting date and quantities for each product SKU
- **FR-006**: System MUST support multiple product SKUs per menu category with different sales units (봉/box/파닭/etc.)
- **FR-007**: System MUST display sales history showing all daily entries in chronological order
- **FR-008**: System MUST apply SKU conversion factors to translate sales quantities into raw ingredient equivalents for cost calculation
- **FR-009**: System MUST provide period analysis accepting start date and end date parameters
- **FR-010**: System MUST calculate and display total purchase costs grouped by menu category for the selected period
- **FR-011**: System MUST apply configurable distribution percentages to allocate purchase costs across menu categories
- **FR-012**: System MUST validate that distribution percentages sum to 100% before performing cost allocation
- **FR-013**: System MUST calculate margin percentage for each menu as (sales revenue - allocated cost) / sales revenue
- **FR-014**: System MUST display cost analysis showing purchase costs, allocated costs, and margin percentages by menu
- **FR-015**: System MUST provide management interfaces for menu categories, ingredient lists, and menu-ingredient relationships
- **FR-016**: System MUST provide management interface for SKU conversion factors mapping sales units to ingredient quantities
- **FR-017**: System MUST provide management interface for SKU selling prices used to calculate revenue from sales quantities
- **FR-018**: System MUST calculate daily sales revenue as sum of (SKU quantity × SKU selling price) for all SKUs sold that day
- **FR-019**: System MUST provide management interface for cost distribution percentages by menu
- **FR-020**: System MUST persist all transaction data (purchases and sales) for historical tracking
- **FR-021**: System MUST support responsive layouts that work on desktop, tablet, and mobile devices
- **FR-022**: System MUST allow editing and correction of historical purchase and sales entries

### Key Entities

- **Purchase Transaction**: Represents a single purchase event. Key attributes: transaction date, menu category, ingredient name, supplier name, quantity purchased, unit price, unit description, calculated total amount, validation status. Related to Menu and Ingredient entities.

- **Sales Record**: Represents daily sales quantities by product SKU. Key attributes: sales date, product SKU identifier, quantity sold. Related to SKU Conversion and Menu entities for cost calculation.

- **Menu Category**: Represents a product category sold to customers (e.g., "양념치킨", "순살치킨", "파닭치킨"). Key attributes: category name, cost distribution percentage. Related to Ingredient and Purchase Transaction entities.

- **Ingredient**: Represents a raw material or supply item. Key attributes: ingredient name. Related to Menu Category through many-to-many relationship (one ingredient used in multiple menus, one menu uses multiple ingredients).

- **SKU (Sales Unit)**: Represents a product sold to customers with pricing and conversion information. Key attributes: SKU identifier, menu category, sales unit name, conversion factor to raw ingredients, selling price, description. Related to Menu and Sales Record entities. Used to calculate both revenue and ingredient cost allocation.

- **Cost Distribution Rule**: Represents the percentage allocation of costs to each menu category. Key attributes: menu category, distribution percentage. Used in period analysis for cost allocation calculation.

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Operators can enter a complete purchase transaction in under 30 seconds
- **SC-002**: System validates purchase entries against master data in real-time (under 1 second response)
- **SC-003**: Operators can enter daily sales data for all SKUs in under 2 minutes
- **SC-004**: Period analysis displays cost and margin calculations for any date range in under 3 seconds
- **SC-005**: System displays correctly formatted responsive layouts on mobile devices (screen width 375px+), tablets (768px+), and desktop (1024px+)
- **SC-006**: 95% of purchase and sales entries are validated as "OK" without data entry errors
- **SC-007**: System maintains 100% data accuracy for calculated fields (totals, percentages, margins) with no rounding errors exceeding 0.01
- **SC-008**: Operators can retrieve and view complete transaction history for any date range without pagination delays (under 2 seconds for up to 1000 records)
- **SC-009**: System reduces time spent on monthly cost analysis from 2+ hours (Excel manual process) to under 10 minutes
- **SC-010**: Cost distribution percentage validation prevents calculation errors 100% of the time by blocking invalid configurations

### Assumptions

- **Business Context**: This system is designed for a single-location fried chicken restaurant ("나성닭강정") with existing Excel-based tracking. The business has established menu categories and ingredient lists that are relatively stable.

- **Data Volume**: The system will handle approximately 10-50 purchase transactions per month and daily sales entries (30-31 records per month), with total data volume expected under 10,000 records per year.

- **User Access**: The system will be used by 1-3 business operators who have basic computer/mobile device skills. No multi-tenant or role-based access control is required initially.

- **Data Retention**: All historical transaction data will be retained indefinitely for tax and accounting purposes. No automatic archival or deletion policies are needed.

- **Master Data Changes**: Menu categories, ingredients, and SKU conversions change infrequently (quarterly or less). Changes to master data do not retroactively affect historical calculations.

- **Cost Distribution Method**: The percentage-based cost allocation method is sufficient for business needs. More sophisticated cost accounting methods (e.g., activity-based costing, FIFO inventory) are not required.

- **Sales Revenue Data**: Sales revenue is calculated automatically by the system using predefined prices for each SKU. Each SKU has a fixed selling price that is multiplied by the quantity sold to determine daily revenue. This assumes consistent pricing without frequent discounts or promotions.

- **Currency**: All monetary values are in Korean Won (₩). No multi-currency support is needed.

- **Calculation Precision**: Financial calculations use standard decimal precision (2 decimal places for currency, 4 decimal places for percentages and conversion factors).

- **Offline Support**: The system requires internet connectivity. Offline data entry and synchronization are not required initially but may be valuable for future enhancement.

### Scope

**In Scope**:

- Web-based purchase transaction entry and history tracking
- Web-based daily sales quantity entry and history tracking
- Period-based cost analysis with configurable date ranges
- Menu category and ingredient master data management
- SKU conversion factor configuration
- Cost distribution percentage management
- Responsive user interface for mobile, tablet, and desktop
- Data validation and error prevention
- Historical data editing and correction

**Out of Scope**:

- Real-time POS system integration (sales data is manually entered)
- Automated supplier ordering or inventory replenishment
- Employee management or payroll integration
- Customer relationship management (CRM) features
- Multi-location or franchise management
- Advanced inventory tracking (e.g., FIFO, LIFO, lot tracking, expiration dates)
- Financial accounting integration (general ledger, accounts payable)
- Mobile native applications (mobile web is sufficient)
- Barcode scanning or IoT device integration
- Automated supplier price comparison or purchasing recommendations
- Forecasting or predictive analytics
- Export to formats other than existing Excel structure
- Multi-language support (Korean only)
- User authentication and authorization (initially single-user or simple password protection)

## Dependencies

- None (standalone system replacing Excel workflow)

## Constraints

- Must maintain data compatibility with existing Excel file structure for potential import/export
- Must preserve existing business logic for cost allocation and margin calculation
- System must be accessible via modern web browsers (Chrome, Safari, Edge, Firefox latest versions)
- Must support Korean language input and display correctly
