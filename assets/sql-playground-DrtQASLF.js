const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/sql-wasm-browser-C8wkZCOL.js","assets/rolldown-runtime-hePW80VL.js"])))=>i.map(i=>d[i]);
import{r as e}from"./rolldown-runtime-hePW80VL.js";import{h as t,m as n,t as r}from"./index-IKdua7Dr.js";var i=e(t(),1),a=`/FANGpreparations/assets/sql-wasm-DfANybxk.wasm`,o={ecommerce:`-- E-commerce sample DB. Deliberate teaching features:
--   a customer with no orders (LEFT JOIN), a cancelled order (WHERE on status),
--   price ties, and an anti-join that legitimately returns nothing
--   (every product has sold at least once — an empty result IS the answer).
CREATE TABLE categories (
  id   INTEGER PRIMARY KEY,
  name TEXT NOT NULL
);
CREATE TABLE products (
  id          INTEGER PRIMARY KEY,
  name        TEXT NOT NULL,
  category_id INTEGER REFERENCES categories(id),
  price       REAL NOT NULL,
  stock       INTEGER NOT NULL
);
CREATE TABLE customers (
  id     INTEGER PRIMARY KEY,
  name   TEXT NOT NULL,
  city   TEXT,
  joined DATE NOT NULL
);
CREATE TABLE orders (
  id          INTEGER PRIMARY KEY,
  customer_id INTEGER REFERENCES customers(id),
  ordered_at  DATE NOT NULL,
  status      TEXT NOT NULL DEFAULT 'delivered'
);
CREATE TABLE order_items (
  order_id   INTEGER REFERENCES orders(id),
  product_id INTEGER REFERENCES products(id),
  qty        INTEGER NOT NULL,
  unit_price REAL NOT NULL
);

INSERT INTO categories VALUES
 (1,'Electronics'),(2,'Books'),(3,'Clothing'),(4,'Home'),(5,'Sports');

INSERT INTO products VALUES
 (1,'Wireless Mouse',1,899,140),
 (2,'Mechanical Keyboard',1,3499,60),
 (3,'USB-C Hub',1,1799,85),
 (4,'Noise-Canceling Headphones',1,7999,30),
 (5,'Clean Code',2,499,200),
 (6,'The Pragmatic Programmer',2,599,150),
 (7,'Grokking Algorithms',2,499,90),
 (8,'Cotton T-Shirt',3,399,300),
 (9,'Running Jacket',3,1499,75),
 (10,'Ceramic Mug',4,249,180),
 (11,'Desk Lamp',4,1099,45),
 (12,'Yoga Mat',5,799,110);

INSERT INTO customers VALUES
 (1,'Aarav','Mumbai','2024-11-02'),
 (2,'Diya','Delhi','2024-12-18'),
 (3,'Kabir','Bengaluru','2025-01-05'),
 (4,'Meera','Pune','2025-02-20'),
 (5,'Rohan','Hyderabad','2025-03-11'),
 (6,'Sana','Delhi','2025-04-01'),
 (7,'Vikram','Chennai','2025-05-09'),
 (8,'Zoya','Mumbai','2025-06-15');   -- Zoya has never ordered

INSERT INTO orders VALUES
 (101,1,'2025-04-03','delivered'),
 (102,2,'2025-04-15','delivered'),
 (103,1,'2025-05-02','delivered'),
 (104,3,'2025-05-10','cancelled'),
 (105,4,'2025-05-21','delivered'),
 (106,5,'2025-06-01','delivered'),
 (107,2,'2025-06-08','delivered'),
 (108,6,'2025-06-19','delivered'),
 (109,3,'2025-07-04','delivered'),
 (110,7,'2025-07-12','delivered'),
 (111,1,'2025-07-25','delivered'),
 (112,4,'2025-08-02','delivered');

INSERT INTO order_items VALUES
 (101,1,1,899),(101,5,2,499),
 (102,4,1,7999),
 (103,2,1,3499),(103,3,1,1799),
 (104,9,1,1499),
 (105,8,3,399),(105,10,2,249),
 (106,12,1,799),(106,7,1,499),
 (107,6,1,599),(107,5,1,499),
 (108,11,1,1099),
 (109,1,2,899),(109,10,4,249),
 (110,2,1,3499),
 (111,4,1,7999),(111,3,1,1799),(111,8,2,399),
 (112,9,1,1499),(112,12,2,799);
`,employees:`-- Employees sample DB — the classic interview schema. Teaching features:
--   salary ties (RANK vs DENSE_RANK), self-join via manager_id,
--   an empty department, employees earning more than their manager.
CREATE TABLE departments (
  id   INTEGER PRIMARY KEY,
  name TEXT NOT NULL
);
CREATE TABLE employees (
  id         INTEGER PRIMARY KEY,
  name       TEXT NOT NULL,
  salary     INTEGER NOT NULL,
  dept_id    INTEGER REFERENCES departments(id),
  manager_id INTEGER REFERENCES employees(id),
  hire_date  DATE NOT NULL
);

INSERT INTO departments VALUES
 (1,'Engineering'),(2,'Data'),(3,'Sales'),(4,'HR'),(5,'Research');  -- Research is empty

INSERT INTO employees VALUES
 (1,'Ananya',3200000,1,NULL,'2019-03-12'),     -- Eng head
 (2,'Bharat',2100000,1,1,'2020-07-01'),
 (3,'Chitra',1850000,1,1,'2021-01-15'),
 (4,'Dev',2400000,1,1,'2020-02-10'),           -- earns more than some peers
 (5,'Esha',1850000,1,2,'2022-06-20'),          -- tie with Chitra
 (6,'Farhan',2600000,2,NULL,'2019-09-05'),     -- Data head
 (7,'Gauri',1950000,2,6,'2021-04-18'),
 (8,'Harsh',2750000,2,6,'2021-11-30'),         -- earns MORE than manager Farhan
 (9,'Ishita',1600000,2,7,'2023-02-14'),
 (10,'Jai',1400000,3,NULL,'2020-05-22'),       -- Sales head
 (11,'Kavya',1250000,3,10,'2022-08-09'),
 (12,'Laksh',1250000,3,10,'2023-03-27'),       -- tie with Kavya
 (13,'Mahi',1550000,3,10,'2021-12-01'),        -- earns MORE than manager Jai
 (14,'Nikhil',1100000,4,NULL,'2020-10-16'),    -- HR head
 (15,'Ojas',950000,4,14,'2023-07-08');
`},s=null,c=new Map;function l(){return s??=n(()=>import(`./sql-wasm-browser-C8wkZCOL.js`).then(t=>e(t.default,1)).then(e=>e.default({locateFile:()=>a})),__vite__mapDeps([0,1]))}async function u(e){let t=await l(),n=c.get(e);return n||(n=new t.Database,n.run(o[e]),c.set(e,n)),n}async function d(e){return c.get(e)?.close(),c.delete(e),u(e)}async function f(e){let t=new(await(l())).Database;return t.run(o[e]),t}var p=[{id:`ec-cheap-products`,db:`ecommerce`,title:`Filter + sort`,prompt:`List the name and price of all products cheaper than ₹1000, cheapest first.`,solution:`SELECT name, price FROM products WHERE price < 1000 ORDER BY price;`,ordered:!0,hint:`WHERE filters rows; ORDER BY sorts what survives.`},{id:`ec-revenue-per-category`,db:`ecommerce`,title:`JOIN + GROUP BY`,prompt:`Total revenue (qty × unit_price) per category name, across all order items.`,solution:`SELECT c.name, SUM(oi.qty * oi.unit_price) AS revenue
FROM order_items oi
JOIN products p ON p.id = oi.product_id
JOIN categories c ON c.id = p.category_id
GROUP BY c.name;`,hint:`Two joins to walk order_items → products → categories, then GROUP BY the category.`},{id:`ec-customers-no-orders`,db:`ecommerce`,title:`LEFT JOIN nulls`,prompt:`Find the names of customers who have never placed an order.`,solution:`SELECT cu.name FROM customers cu
LEFT JOIN orders o ON o.customer_id = cu.id
WHERE o.id IS NULL;`,hint:`LEFT JOIN keeps every customer; the ones with no match carry NULL order columns.`},{id:`ec-top-spenders`,db:`ecommerce`,title:`Top-N aggregation`,prompt:`Top 3 customers by total spend (name, total), highest first. Ignore cancelled orders.`,solution:`SELECT cu.name, SUM(oi.qty * oi.unit_price) AS total
FROM customers cu
JOIN orders o ON o.customer_id = cu.id AND o.status != 'cancelled'
JOIN order_items oi ON oi.order_id = o.id
GROUP BY cu.id
ORDER BY total DESC
LIMIT 3;`,ordered:!0,hint:`Filter the cancelled order in the JOIN condition (or a WHERE), aggregate, ORDER BY … DESC LIMIT 3.`},{id:`ec-orders-per-month`,db:`ecommerce`,title:`Date bucketing`,prompt:`Number of orders per month, as ('YYYY-MM', count).`,solution:`SELECT strftime('%Y-%m', ordered_at) AS month, COUNT(*) AS orders
FROM orders GROUP BY month;`,hint:`SQLite: strftime('%Y-%m', date_column) buckets by month.`},{id:`ec-never-ordered`,db:`ecommerce`,title:`Anti-join`,prompt:`Names of products that appear in no order.`,solution:`SELECT name FROM products
WHERE id NOT IN (SELECT product_id FROM order_items);`,hint:`NOT IN a subquery — or a LEFT JOIN … IS NULL, both work. Fair warning: in this catalogue every product has sold at least once, so the correct answer is an EMPTY result. An anti-join returning nothing is an answer, not a bug.`},{id:`emp-second-salary`,db:`employees`,title:`The classic`,prompt:`The 2nd highest distinct salary in the company (one row, one column).`,solution:`SELECT MAX(salary) AS salary FROM employees WHERE salary < (SELECT MAX(salary) FROM employees);`,hint:`MAX below the MAX. (Also solvable with DISTINCT + ORDER BY + LIMIT 1 OFFSET 1, or DENSE_RANK.)`},{id:`emp-more-than-manager`,db:`employees`,title:`Self-join`,prompt:`Employees who earn strictly more than their manager (employee name, manager name).`,solution:`SELECT e.name, m.name AS manager
FROM employees e
JOIN employees m ON m.id = e.manager_id
WHERE e.salary > m.salary;`,hint:`Join the table to itself: one alias is the employee, the other the manager.`},{id:`emp-dept-above-avg`,db:`employees`,title:`Subquery vs aggregate`,prompt:`Department names whose average salary is above the overall average salary.`,solution:`SELECT d.name
FROM departments d
JOIN employees e ON e.dept_id = d.id
GROUP BY d.id
HAVING AVG(e.salary) > (SELECT AVG(salary) FROM employees);`,hint:`HAVING filters groups — and the overall average is a scalar subquery.`},{id:`emp-dense-rank`,db:`employees`,title:`Window functions`,prompt:`Every employee with their salary rank within their department (name, dept_id, salary, rnk) using DENSE_RANK, highest salary = rank 1.`,solution:`SELECT name, dept_id, salary,
  DENSE_RANK() OVER (PARTITION BY dept_id ORDER BY salary DESC) AS rnk
FROM employees;`,hint:`PARTITION BY restarts the ranking per department. Note how the salary ties share a rank.`},{id:`emp-running-total`,db:`employees`,title:`Running total`,prompt:`By hire date, each hire with the running total of salaries up to and including them (name, hire_date, running_total), oldest first.`,solution:`SELECT name, hire_date,
  SUM(salary) OVER (ORDER BY hire_date) AS running_total
FROM employees ORDER BY hire_date;`,ordered:!0,hint:`SUM(...) OVER (ORDER BY …) is a running total — no self-join needed.`},{id:`emp-where-vs-having`,db:`employees`,title:`WHERE vs HAVING`,prompt:`Departments (name) that have more than 2 employees hired since 2021-01-01.`,solution:`SELECT d.name
FROM departments d
JOIN employees e ON e.dept_id = d.id
WHERE e.hire_date >= '2021-01-01'
GROUP BY d.id
HAVING COUNT(*) > 2;`,hint:`WHERE trims rows BEFORE grouping; HAVING judges the finished groups. This one needs both.`},{id:`ec-distinct-cities`,db:`ecommerce`,title:`DISTINCT`,prompt:`Every distinct city our customers live in — one column, alphabetical.`,solution:`SELECT DISTINCT city FROM customers ORDER BY city;`,ordered:!0,hint:`DISTINCT collapses duplicate rows across all selected columns, not just the first one.`},{id:`ec-name-prefix`,db:`ecommerce`,title:`LIKE prefix`,prompt:`Name and price of every product whose name starts with the letter C, alphabetical by name.`,solution:`SELECT name, price FROM products WHERE name LIKE 'C%' ORDER BY name;`,ordered:!0,hint:`LIKE with % as the wildcard: anchor it at the end for a prefix match. SQLite's LIKE is case-insensitive for ASCII.`},{id:`ec-price-between`,db:`ecommerce`,title:`BETWEEN`,prompt:`Name and price of products priced from ₹500 to ₹2000 inclusive, cheapest first.`,solution:`SELECT name, price FROM products WHERE price BETWEEN 500 AND 2000 ORDER BY price;`,ordered:!0,hint:`BETWEEN is inclusive on both ends — it is exactly >= AND <=.`},{id:`ec-cities-in-list`,db:`ecommerce`,title:`IN list`,prompt:`Name and city of customers living in Mumbai, Delhi or Pune.`,solution:`SELECT name, city FROM customers WHERE city IN ('Mumbai', 'Delhi', 'Pune');`,hint:`IN (...) is shorthand for a chain of ORs — and reads far better.`},{id:`emp-no-manager`,db:`employees`,title:`IS NULL`,prompt:`Names of employees who report to nobody (the department heads).`,solution:`SELECT name FROM employees WHERE manager_id IS NULL;`,hint:`NULL is not a value you can compare with = — only IS NULL / IS NOT NULL work.`},{id:`emp-top5-salaries`,db:`employees`,title:`ORDER + LIMIT`,prompt:`The five best-paid employees (name, salary), highest first.`,solution:`SELECT name, salary FROM employees ORDER BY salary DESC LIMIT 5;`,ordered:!0,hint:`Sort descending, then cut. LIMIT applies after ORDER BY, never before.`},{id:`emp-count-star-vs-col`,db:`employees`,title:`COUNT(*) vs COUNT(col)`,prompt:`Every department with COUNT(*) and COUNT(of the employee id) side by side (name, rows_count, employees). One department is empty — that is the point.`,solution:`SELECT d.name, COUNT(*) AS rows_count, COUNT(e.id) AS employees
FROM departments d
LEFT JOIN employees e ON e.dept_id = d.id
GROUP BY d.id;`,hint:`After a LEFT JOIN the empty department still produces one row full of NULLs: COUNT(*) counts that row, COUNT(column) skips NULLs.`},{id:`emp-avg-salary-by-dept`,db:`employees`,title:`Average per group`,prompt:`Average salary per department (name, avg_salary rounded to 2 decimals). Departments with no employees are not expected.`,solution:`SELECT d.name, ROUND(AVG(e.salary), 2) AS avg_salary
FROM departments d
JOIN employees e ON e.dept_id = d.id
GROUP BY d.id;`,hint:`An inner join already drops the empty department for you — no filter needed.`},{id:`emp-big-departments`,db:`employees`,title:`HAVING count`,prompt:`Departments with 4 or more employees (name, headcount).`,solution:`SELECT d.name, COUNT(*) AS headcount
FROM departments d
JOIN employees e ON e.dept_id = d.id
GROUP BY d.id
HAVING COUNT(*) >= 4;`,hint:`You cannot put an aggregate in WHERE — the groups do not exist yet at that point. HAVING runs after grouping.`},{id:`ec-order-totals`,db:`ecommerce`,title:`Order values`,prompt:`Every order with its total value (order_id, total), most valuable first.`,solution:`SELECT order_id, SUM(qty * unit_price) AS total
FROM order_items
GROUP BY order_id
ORDER BY total DESC;`,ordered:!0,hint:`Everything you need is inside order_items — no join required. Aggregate first, sort by the aggregate second.`},{id:`ec-category-price-range`,db:`ecommerce`,title:`Multiple aggregates`,prompt:`Per category: name, cheapest price, priciest price and number of products (name, cheapest, priciest, products).`,solution:`SELECT c.name, MIN(p.price) AS cheapest, MAX(p.price) AS priciest, COUNT(*) AS products
FROM categories c
JOIN products p ON p.category_id = c.id
GROUP BY c.id;`,hint:`One GROUP BY can carry as many aggregates as you like — they all see the same group of rows.`},{id:`emp-where-and-having`,db:`employees`,title:`WHERE and HAVING`,prompt:`Among employees hired on or after 2021-01-01, department names whose average salary is above 1,700,000 (name, avg_salary rounded to 2).`,solution:`SELECT d.name, ROUND(AVG(e.salary), 2) AS avg_salary
FROM departments d
JOIN employees e ON e.dept_id = d.id
WHERE e.hire_date >= '2021-01-01'
GROUP BY d.id
HAVING AVG(e.salary) > 1700000;`,hint:`WHERE picks which rows enter the groups; HAVING judges the finished groups. The average here is over the filtered rows only.`},{id:`ec-units-per-product`,db:`ecommerce`,title:`HAVING on SUM`,prompt:`Products with more than 2 units sold in total (name, units), most units first, ties broken by product name.`,solution:`SELECT p.name, SUM(oi.qty) AS units
FROM products p
JOIN order_items oi ON oi.product_id = p.id
GROUP BY p.id
HAVING SUM(oi.qty) > 2
ORDER BY units DESC, p.name;`,ordered:!0,hint:`SUM(qty) is not the same as COUNT(*): one counts units, the other counts order lines.`},{id:`ec-order-customer-list`,db:`ecommerce`,title:`Inner join`,prompt:`Every order with the customer who placed it (order id, customer name, ordered_at), by order id ascending.`,solution:`SELECT o.id, cu.name, o.ordered_at
FROM orders o
JOIN customers cu ON cu.id = o.customer_id
ORDER BY o.id;`,ordered:!0,hint:`The foreign key tells you the ON condition: orders.customer_id points at customers.id.`},{id:`ec-orders-per-customer`,db:`ecommerce`,title:`LEFT JOIN count`,prompt:`Every customer with how many orders they have placed (name, orders) — a customer with none must show 0, not disappear.`,solution:`SELECT cu.name, COUNT(o.id) AS orders
FROM customers cu
LEFT JOIN orders o ON o.customer_id = cu.id
GROUP BY cu.id;`,hint:`LEFT JOIN keeps the customer; COUNT of the joined column (not COUNT(*)) turns the all-NULL row into a 0.`},{id:`emp-manager-of-each`,db:`employees`,title:`Self LEFT JOIN`,prompt:`Every employee with their manager's name (employee, manager). Heads show NULL for manager.`,solution:`SELECT e.name AS employee, m.name AS manager
FROM employees e
LEFT JOIN employees m ON m.id = e.manager_id;`,hint:`Same table twice with two aliases. It must be a LEFT join or the five heads vanish.`},{id:`emp-report-counts`,db:`employees`,title:`Direct reports`,prompt:`Managers with their number of direct reports (manager, reports), most reports first, ties by manager name.`,solution:`SELECT m.name AS manager, COUNT(*) AS reports
FROM employees e
JOIN employees m ON m.id = e.manager_id
GROUP BY m.id
ORDER BY reports DESC, m.name;`,ordered:!0,hint:`Self-join, then group by the manager side. Only people who actually manage someone can appear.`},{id:`ec-no-electronics`,db:`ecommerce`,title:`Anti-join`,prompt:`Names of customers who have never ordered anything from the Electronics category (customers with no orders at all count too).`,solution:`SELECT name FROM customers
WHERE id NOT IN (
  SELECT o.customer_id
  FROM orders o
  JOIN order_items oi ON oi.order_id = o.id
  JOIN products p ON p.id = oi.product_id
  JOIN categories c ON c.id = p.category_id
  WHERE c.name = 'Electronics'
);`,hint:`Build the set of customers who DID buy electronics, then exclude it. Watch out: if that inner list could contain a NULL, NOT IN returns nothing at all — NOT EXISTS is the safe habit.`},{id:`ec-item-detail-chain`,db:`ecommerce`,title:`Four-table chain`,prompt:`Every order line as (order_id, customer, product, qty), sorted by order id then product name.`,solution:`SELECT o.id AS order_id, cu.name AS customer, p.name AS product, oi.qty
FROM order_items oi
JOIN orders o ON o.id = oi.order_id
JOIN customers cu ON cu.id = o.customer_id
JOIN products p ON p.id = oi.product_id
ORDER BY o.id, p.name;`,ordered:!0,hint:`Start from the most granular table (order_items) and walk outwards; each join adds one lookup.`},{id:`ec-fanout-trap`,db:`ecommerce`,title:`Fan-out trap`,prompt:`For each customer who has ordered: name, number of distinct orders, and number of order-line rows (name, orders, lines).`,solution:`SELECT cu.name, COUNT(DISTINCT o.id) AS orders, COUNT(*) AS lines
FROM customers cu
JOIN orders o ON o.customer_id = cu.id
JOIN order_items oi ON oi.order_id = o.id
GROUP BY cu.id;`,hint:`Joining order_items multiplies each order row by its line count. COUNT(DISTINCT ...) is the antidote — the same trap silently doubles SUMs.`},{id:`emp-dept-payroll-all`,db:`employees`,title:`COALESCE zero`,prompt:`Every department with its total payroll (name, payroll) — a department with no employees must show 0, not NULL.`,solution:`SELECT d.name, COALESCE(SUM(e.salary), 0) AS payroll
FROM departments d
LEFT JOIN employees e ON e.dept_id = d.id
GROUP BY d.id;`,hint:`SUM over zero non-NULL values is NULL, not 0. COALESCE(x, 0) fixes that at the edge.`},{id:`ec-above-avg-price`,db:`ecommerce`,title:`Scalar subquery`,prompt:`Products priced above the average product price (name, price), priciest first.`,solution:`SELECT name, price FROM products
WHERE price > (SELECT AVG(price) FROM products)
ORDER BY price DESC;`,ordered:!0,hint:`A subquery returning exactly one row and one column can be used anywhere a value can.`},{id:`ec-avg-order-value`,db:`ecommerce`,title:`Derived table`,prompt:`The average order value across all orders — one row, one column, rounded to 2 decimals.`,solution:`SELECT ROUND(AVG(total), 2) AS avg_order_value
FROM (SELECT order_id, SUM(qty * unit_price) AS total FROM order_items GROUP BY order_id) AS t;`,hint:`You cannot nest aggregates directly. Compute per-order totals in a derived table (always alias it), then average that.`},{id:`emp-has-reports`,db:`employees`,title:`EXISTS`,prompt:`Names of employees who manage at least one other employee.`,solution:`SELECT e.name FROM employees e
WHERE EXISTS (SELECT 1 FROM employees r WHERE r.manager_id = e.id);`,hint:`EXISTS stops at the first match and never cares what you select inside it — 1 is the convention.`},{id:`emp-no-reports`,db:`employees`,title:`NOT EXISTS`,prompt:`Names of employees who manage nobody — the individual contributors.`,solution:`SELECT e.name FROM employees e
WHERE NOT EXISTS (SELECT 1 FROM employees r WHERE r.manager_id = e.id);`,hint:`The mirror image of EXISTS, and unlike NOT IN it behaves correctly when NULLs are around.`},{id:`emp-above-dept-avg`,db:`employees`,title:`Correlated subquery`,prompt:`Employees earning more than the average salary of their own department (name, salary).`,solution:`SELECT e.name, e.salary FROM employees e
WHERE e.salary > (SELECT AVG(e2.salary) FROM employees e2 WHERE e2.dept_id = e.dept_id);`,hint:`The inner query references the outer row (e.dept_id), so it is re-evaluated per employee — that is what makes it correlated.`},{id:`ec-big-spenders-cte`,db:`ecommerce`,title:`Multi-CTE pipeline`,prompt:`Customers whose lifetime spend beats the average customer spend (name, spend), biggest first. Cancelled orders do not count.`,solution:`WITH order_totals AS (
  SELECT o.id AS order_id, o.customer_id AS customer_id, SUM(oi.qty * oi.unit_price) AS total
  FROM orders o
  JOIN order_items oi ON oi.order_id = o.id
  WHERE o.status != 'cancelled'
  GROUP BY o.id, o.customer_id
), customer_totals AS (
  SELECT customer_id, SUM(total) AS spend FROM order_totals GROUP BY customer_id
)
SELECT cu.name, ct.spend
FROM customer_totals ct
JOIN customers cu ON cu.id = ct.customer_id
WHERE ct.spend > (SELECT AVG(spend) FROM customer_totals)
ORDER BY ct.spend DESC;`,ordered:!0,hint:`Two CTEs: per-order totals, then per-customer totals. Naming each step beats one nested monster — and the second CTE can be reused for the average.`},{id:`ec-premium-buyers`,db:`ecommerce`,title:`IN subquery`,prompt:`Names of customers who have ordered at least one product priced above ₹3000.`,solution:`SELECT name FROM customers
WHERE id IN (
  SELECT o.customer_id
  FROM orders o
  JOIN order_items oi ON oi.order_id = o.id
  JOIN products p ON p.id = oi.product_id
  WHERE p.price > 3000
);`,hint:`IN with a subquery de-duplicates for free — the same customer buying twice still yields one row.`},{id:`emp-rank-vs-dense`,db:`employees`,title:`RANK vs DENSE_RANK`,prompt:`Every employee with both rankings by salary across the whole company (name, salary, rnk, dense_rnk), highest salary first, ties by name.`,solution:`SELECT name, salary,
  RANK() OVER (ORDER BY salary DESC) AS rnk,
  DENSE_RANK() OVER (ORDER BY salary DESC) AS dense_rnk
FROM employees
ORDER BY salary DESC, name;`,ordered:!0,hint:`Two employees share 1850000. RANK leaves a hole after the tie, DENSE_RANK does not.`},{id:`emp-top2-per-dept`,db:`employees`,title:`Top-N per group`,prompt:`The two highest-paid employees in each department (dept, employee, salary). If a department ties at second place, show every tied person.`,solution:`SELECT dept, employee, salary FROM (
  SELECT d.name AS dept, e.name AS employee, e.salary AS salary,
    RANK() OVER (PARTITION BY e.dept_id ORDER BY e.salary DESC) AS rnk
  FROM employees e
  JOIN departments d ON d.id = e.dept_id
) AS ranked
WHERE rnk <= 2;`,hint:`You cannot filter on a window function in WHERE — wrap it in a derived table (aliased!) and filter outside. RANK, not ROW_NUMBER, because ties must all survive.`},{id:`emp-first-hire-per-dept`,db:`employees`,title:`ROW_NUMBER pick`,prompt:`The earliest hire in each department (dept, employee, hire_date) — exactly one row per department that has employees.`,solution:`SELECT dept, employee, hire_date FROM (
  SELECT d.name AS dept, e.name AS employee, e.hire_date AS hire_date,
    ROW_NUMBER() OVER (PARTITION BY e.dept_id ORDER BY e.hire_date) AS rn
  FROM employees e
  JOIN departments d ON d.id = e.dept_id
) AS t
WHERE rn = 1;`,hint:`ROW_NUMBER is the right tool when you want exactly one winner per group, ties or not.`},{id:`emp-prev-hire-salary`,db:`employees`,title:`LAG`,prompt:`Ordered by hire date, every employee with the salary of the person hired immediately before them (name, hire_date, salary, prev_salary). The first hire shows NULL.`,solution:`SELECT name, hire_date, salary,
  LAG(salary) OVER (ORDER BY hire_date) AS prev_salary
FROM employees
ORDER BY hire_date;`,ordered:!0,hint:`LAG reaches backwards inside the window; there is no previous row for the first one, so it is NULL.`},{id:`emp-next-hire-gap`,db:`employees`,title:`LEAD + gap`,prompt:`Ordered by hire date: name, hire_date, the next hire's date, and the gap in whole days (name, hire_date, next_hire, gap_days). The last hire shows NULLs.`,solution:`SELECT name, hire_date,
  LEAD(hire_date) OVER (ORDER BY hire_date) AS next_hire,
  CAST(julianday(LEAD(hire_date) OVER (ORDER BY hire_date)) - julianday(hire_date) AS INTEGER) AS gap_days
FROM employees
ORDER BY hire_date;`,ordered:!0,hint:`LEAD is LAG's mirror. In SQLite, julianday(a) - julianday(b) gives the day difference between two dates.`},{id:`ec-running-revenue`,db:`ecommerce`,title:`Running total`,prompt:`Every non-cancelled order oldest first, with its value and the running revenue up to and including it (ordered_at, order_id, value, running_total).`,solution:`WITH totals AS (
  SELECT o.id AS order_id, o.ordered_at AS ordered_at, SUM(oi.qty * oi.unit_price) AS value
  FROM orders o
  JOIN order_items oi ON oi.order_id = o.id
  WHERE o.status != 'cancelled'
  GROUP BY o.id, o.ordered_at
)
SELECT ordered_at, order_id, value,
  SUM(value) OVER (ORDER BY ordered_at) AS running_total
FROM totals
ORDER BY ordered_at;`,ordered:!0,hint:`Aggregate to one row per order first, then run a window SUM over that. An ORDER BY inside OVER implies a running frame.`},{id:`ec-moving-average`,db:`ecommerce`,title:`Moving average`,prompt:`Non-cancelled orders oldest first, each with its value and the average value over itself plus the two orders before it (ordered_at, value, moving_avg_3), rounded to 2 decimals.`,solution:`WITH totals AS (
  SELECT o.id AS order_id, o.ordered_at AS ordered_at, SUM(oi.qty * oi.unit_price) AS value
  FROM orders o
  JOIN order_items oi ON oi.order_id = o.id
  WHERE o.status != 'cancelled'
  GROUP BY o.id, o.ordered_at
)
SELECT ordered_at, value,
  ROUND(AVG(value) OVER (ORDER BY ordered_at ROWS BETWEEN 2 PRECEDING AND CURRENT ROW), 2) AS moving_avg_3
FROM totals
ORDER BY ordered_at;`,ordered:!0,hint:`ROWS BETWEEN 2 PRECEDING AND CURRENT ROW sizes the window. The first rows average over fewer than three — that is expected, not a bug.`},{id:`emp-salary-quartiles`,db:`employees`,title:`NTILE`,prompt:`Split the workforce into 4 salary bands, band 1 being the best paid (name, salary, band). Order the bands by salary descending, ties broken by name ascending.`,solution:`SELECT name, salary,
  NTILE(4) OVER (ORDER BY salary DESC, name) AS band
FROM employees;`,hint:`NTILE spreads rows as evenly as it can — with 15 rows the first bands get one extra. The tiebreak matters: without it, tied salaries could land in different bands run to run.`},{id:`emp-share-of-dept-payroll`,db:`employees`,title:`Partitioned share`,prompt:`Every employee with their salary as a percentage of their own department's payroll (name, salary, pct), rounded to 2 decimals.`,solution:`SELECT name, salary,
  ROUND(salary * 100.0 / SUM(salary) OVER (PARTITION BY dept_id), 2) AS pct
FROM employees;`,hint:`A window aggregate keeps every row while giving each one the group total. Multiply by 100.0, not 100, or integer division eats the decimals.`},{id:`ec-first-order-per-customer`,db:`ecommerce`,title:`Dedupe to first`,prompt:`Each customer's very first order (name, order_id, ordered_at) — one row per customer who has ordered.`,solution:`SELECT name, order_id, ordered_at FROM (
  SELECT cu.name AS name, o.id AS order_id, o.ordered_at AS ordered_at,
    ROW_NUMBER() OVER (PARTITION BY cu.id ORDER BY o.ordered_at) AS rn
  FROM customers cu
  JOIN orders o ON o.customer_id = cu.id
) AS t
WHERE rn = 1;`,hint:`The standard dedupe shape: number the rows inside each partition, keep number 1.`},{id:`ec-revenue-by-month`,db:`ecommerce`,title:`Revenue by month`,prompt:`Revenue per calendar month from non-cancelled orders (month as 'YYYY-MM', revenue), chronological.`,solution:`SELECT strftime('%Y-%m', o.ordered_at) AS month, SUM(oi.qty * oi.unit_price) AS revenue
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
WHERE o.status != 'cancelled'
GROUP BY month
ORDER BY month;`,ordered:!0,hint:`strftime('%Y-%m', d) gives a sortable month key — 'YYYY-MM' text sorts chronologically for free.`},{id:`ec-month-over-month`,db:`ecommerce`,title:`Month over month`,prompt:`Per month (non-cancelled orders): month, revenue, previous month's revenue and the difference (month, revenue, prev_revenue, delta), chronological. The first month shows NULLs.`,solution:`WITH monthly AS (
  SELECT strftime('%Y-%m', o.ordered_at) AS month, SUM(oi.qty * oi.unit_price) AS revenue
  FROM orders o
  JOIN order_items oi ON oi.order_id = o.id
  WHERE o.status != 'cancelled'
  GROUP BY month
)
SELECT month, revenue,
  LAG(revenue) OVER (ORDER BY month) AS prev_revenue,
  revenue - LAG(revenue) OVER (ORDER BY month) AS delta
FROM monthly
ORDER BY month;`,ordered:!0,hint:`Bucket into months first, then LAG over the buckets. Careful: this compares adjacent rows, not adjacent calendar months — a month with zero orders is simply absent.`},{id:`emp-hire-cohorts`,db:`employees`,title:`Hire cohorts`,prompt:`Per hire year: the year, how many people joined, and their average salary (year, hires, avg_salary rounded to 2), oldest year first.`,solution:`SELECT strftime('%Y', hire_date) AS year, COUNT(*) AS hires, ROUND(AVG(salary), 2) AS avg_salary
FROM employees
GROUP BY year
ORDER BY year;`,ordered:!0,hint:`A cohort is just a GROUP BY on a date bucket — here the joining year.`},{id:`ec-customer-order-span`,db:`ecommerce`,title:`Date span`,prompt:`For customers with more than one order, the whole-day gap between their first and last order (name, days), longest span first.`,solution:`SELECT cu.name, CAST(julianday(MAX(o.ordered_at)) - julianday(MIN(o.ordered_at)) AS INTEGER) AS days
FROM customers cu
JOIN orders o ON o.customer_id = cu.id
GROUP BY cu.id
HAVING COUNT(*) > 1
ORDER BY days DESC;`,ordered:!0,hint:`MIN and MAX work on dates too. julianday turns both into numbers you can subtract.`},{id:`emp-third-highest-offset`,db:`employees`,title:`3rd highest salary`,prompt:`The 3rd highest distinct salary in the company — one row, one column.`,solution:`SELECT DISTINCT salary FROM employees ORDER BY salary DESC LIMIT 1 OFFSET 2;`,hint:`DISTINCT first so tied salaries do not eat an offset slot; OFFSET 2 skips the top two.`},{id:`emp-fifth-highest-dense`,db:`employees`,title:`Nth via DENSE_RANK`,prompt:`The 5th highest distinct salary in the company — one row, one column. Solve it with DENSE_RANK this time.`,solution:`SELECT DISTINCT salary FROM (
  SELECT salary, DENSE_RANK() OVER (ORDER BY salary DESC) AS dr
  FROM employees
) AS t
WHERE dr = 5;`,hint:`DENSE_RANK numbers distinct salary levels, so 'Nth highest' is literally dr = N. This is the version that generalises to Nth-per-group.`},{id:`emp-duplicate-salaries`,db:`employees`,title:`Find duplicates`,prompt:`Salary values that more than one employee earns (salary, headcount).`,solution:`SELECT salary, COUNT(*) AS headcount
FROM employees
GROUP BY salary
HAVING COUNT(*) > 1;`,hint:`The universal duplicate finder: GROUP BY the thing that should be unique, HAVING COUNT(*) > 1.`},{id:`emp-dept-top-earner`,db:`employees`,title:`Department maxima`,prompt:`The best-paid employee in each department (dept, employee, salary). If a department ties at the top, list everyone tied.`,solution:`SELECT d.name AS dept, e.name AS employee, e.salary
FROM employees e
JOIN departments d ON d.id = e.dept_id
WHERE e.salary = (SELECT MAX(e2.salary) FROM employees e2 WHERE e2.dept_id = e.dept_id);`,hint:`Compare each employee against their own department's MAX with a correlated subquery — that keeps ties automatically. (A RANK window solves it too.)`},{id:`ec-category-revenue-share`,db:`ecommerce`,title:`Percent of total`,prompt:`Per category: name, revenue and its share of total revenue as a percentage rounded to 2 (name, revenue, pct), biggest share first. All order items count.`,solution:`WITH cat AS (
  SELECT c.name AS name, SUM(oi.qty * oi.unit_price) AS revenue
  FROM order_items oi
  JOIN products p ON p.id = oi.product_id
  JOIN categories c ON c.id = p.category_id
  GROUP BY c.id
)
SELECT name, revenue, ROUND(revenue * 100.0 / (SELECT SUM(revenue) FROM cat), 2) AS pct
FROM cat
ORDER BY pct DESC;`,ordered:!0,hint:`Percentage-of-total needs the grand total as a scalar — a CTE lets you compute the parts once and reuse them for the whole.`},{id:`ec-second-priciest-per-category`,db:`ecommerce`,title:`2nd per group`,prompt:`The second most expensive product in each category (category, product, price), ties in price broken by product name ascending. A category with only one product simply does not appear.`,solution:`SELECT category, product, price FROM (
  SELECT c.name AS category, p.name AS product, p.price AS price,
    ROW_NUMBER() OVER (PARTITION BY c.id ORDER BY p.price DESC, p.name) AS rn
  FROM products p
  JOIN categories c ON c.id = p.category_id
) AS t
WHERE rn = 2;`,hint:`Nth-per-group = number the rows per partition, keep rn = N. Groups too small to have an Nth just drop out.`},{id:`ec-favorite-category`,db:`ecommerce`,title:`Favourite category`,prompt:`For every customer who has ordered: the category they spent the most on (customer, category, spend). Ignore cancelled orders; break spend ties by category name ascending.`,solution:`WITH spend AS (
  SELECT cu.id AS customer_id, cu.name AS customer, c.name AS category,
    SUM(oi.qty * oi.unit_price) AS spend
  FROM customers cu
  JOIN orders o ON o.customer_id = cu.id AND o.status != 'cancelled'
  JOIN order_items oi ON oi.order_id = o.id
  JOIN products p ON p.id = oi.product_id
  JOIN categories c ON c.id = p.category_id
  GROUP BY cu.id, cu.name, c.id, c.name
), ranked AS (
  SELECT customer, category, spend,
    ROW_NUMBER() OVER (PARTITION BY customer_id ORDER BY spend DESC, category) AS rn
  FROM spend
)
SELECT customer, category, spend FROM ranked WHERE rn = 1;`,hint:`Three steps: spend per customer per category, rank those inside each customer, keep the winner. Do not try to do it in one SELECT.`},{id:`ec-repeat-vs-onetime`,db:`ecommerce`,title:`Cohort split`,prompt:`Bucket customers who have ordered into 'repeat' (more than one non-cancelled order) and 'one-time', then per bucket show how many customers and their average total spend (bucket, customers, avg_spend rounded to 2).`,solution:`WITH per_customer AS (
  SELECT o.customer_id AS customer_id,
    COUNT(DISTINCT o.id) AS orders,
    SUM(oi.qty * oi.unit_price) AS spend
  FROM orders o
  JOIN order_items oi ON oi.order_id = o.id
  WHERE o.status != 'cancelled'
  GROUP BY o.customer_id
)
SELECT CASE WHEN orders > 1 THEN 'repeat' ELSE 'one-time' END AS bucket,
  COUNT(*) AS customers,
  ROUND(AVG(spend), 2) AS avg_spend
FROM per_customer
GROUP BY bucket;`,hint:`Aggregate per customer first, then aggregate the aggregates by a CASE label. Note COUNT(DISTINCT o.id) — the join to order_items would otherwise inflate the order count.`},{id:`emp-org-depth`,db:`employees`,title:`Recursive org chart`,prompt:`Every employee with their depth in the org chart (name, level): heads with no manager are level 1, their direct reports level 2, and so on.`,solution:`WITH RECURSIVE org AS (
  SELECT id, name, 1 AS level FROM employees WHERE manager_id IS NULL
  UNION ALL
  SELECT e.id, e.name, org.level + 1
  FROM employees e
  JOIN org ON org.id = e.manager_id
)
SELECT name, level FROM org;`,hint:`A recursive CTE has two halves joined by UNION ALL: the anchor (the roots) and the step that joins the table back onto the CTE itself.`},{id:`ec-cumulative-month-share`,db:`ecommerce`,title:`Cumulative share`,prompt:`By month over non-cancelled orders: month, that month's revenue, cumulative revenue to date, and cumulative share of total revenue as a percentage rounded to 2 (month, revenue, cumulative, cum_pct), chronological.`,solution:`WITH monthly AS (
  SELECT strftime('%Y-%m', o.ordered_at) AS month, SUM(oi.qty * oi.unit_price) AS revenue
  FROM orders o
  JOIN order_items oi ON oi.order_id = o.id
  WHERE o.status != 'cancelled'
  GROUP BY month
)
SELECT month, revenue,
  SUM(revenue) OVER (ORDER BY month) AS cumulative,
  ROUND(SUM(revenue) OVER (ORDER BY month) * 100.0 / (SELECT SUM(revenue) FROM monthly), 2) AS cum_pct
FROM monthly
ORDER BY month;`,ordered:!0,hint:`A running window SUM for the numerator, a plain scalar subquery over the same CTE for the denominator. The last row must land on 100.`}],m=r(),h=500;function g(e,t,n=!1){if(!e||!t)return!e&&!t;if(e.columns.length!==t.columns.length)return!1;let r=e=>{let t=e.values.map(e=>JSON.stringify(e));return(n?t:[...t].sort()).join(`
`)};return r(e)===r(t)}function _({r:e}){let t=e.values.slice(0,h);return(0,m.jsxs)(`div`,{className:`overflow-x-auto rounded-lg border border-line`,children:[(0,m.jsxs)(`table`,{className:`w-full text-sm`,children:[(0,m.jsx)(`thead`,{children:(0,m.jsx)(`tr`,{className:`bg-raised text-left`,children:e.columns.map((e,t)=>(0,m.jsx)(`th`,{className:`border-b border-line px-3 py-1.5 font-mono text-xs font-semibold`,children:e},t))})}),(0,m.jsx)(`tbody`,{children:t.map((e,t)=>(0,m.jsx)(`tr`,{className:`odd:bg-bg even:bg-raised/40`,children:e.map((e,t)=>(0,m.jsx)(`td`,{className:`px-3 py-1 font-mono text-xs`,children:e===null?(0,m.jsx)(`span`,{className:`text-ink-soft italic`,children:`NULL`}):String(e)},t))},t))})]}),e.values.length>h&&(0,m.jsxs)(`p`,{className:`border-t border-line px-3 py-1 text-xs text-ink-soft`,children:[`showing first `,h,` of `,e.values.length,` rows`]}),e.values.length===0&&(0,m.jsx)(`p`,{className:`px-3 py-2 text-xs text-ink-soft`,children:`0 rows`})]})}function v(){let[e,t]=(0,i.useState)(`ecommerce`),[n,r]=(0,i.useState)(!1),[a,o]=(0,i.useState)([]),[s,c]=(0,i.useState)(`SELECT * FROM products LIMIT 5;`),[l,h]=(0,i.useState)({status:`idle`}),[v,y]=(0,i.useState)(null),[b,x]=(0,i.useState)(null),[S,C]=(0,i.useState)(!1),w=(0,i.useCallback)(async e=>{let t=await u(e),n=t.exec(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name`)[0]?.values.map(e=>String(e[0]))??[];o(n.map(e=>({name:e,columns:t.exec(`PRAGMA table_info(${e})`)[0]?.values.map(e=>`${String(e[1])} ${String(e[2]??``)}`.trim())??[]}))),r(!0)},[]);(0,i.useEffect)(()=>{r(!1),w(e)},[e,w]);let T=(0,i.useCallback)(async()=>{h({status:`loading`}),x(null);try{let t=await u(e),n=performance.now(),r=t.exec(s);h({status:`ok`,results:r,ms:Math.round(performance.now()-n)}),w(e)}catch(e){h({status:`error`,message:e instanceof Error?e.message:String(e)})}},[e,s,w]),E=(0,i.useCallback)(async()=>{if(v)try{let e=await f(v.db),t=e.exec(s).at(-1);e.close();let n=await f(v.db),r=n.exec(v.solution).at(-1);n.close(),x(g(t,r,v.ordered)?{verdict:`pass`}:{verdict:`fail`,expected:r??null})}catch(e){h({status:`error`,message:e instanceof Error?e.message:String(e)})}},[v,s]),D=(0,i.useMemo)(()=>p.filter(t=>t.db===e),[e]);return(0,m.jsxs)(`div`,{className:`mx-auto max-w-5xl px-8 py-10`,children:[(0,m.jsxs)(`header`,{className:`flex flex-wrap items-center gap-3`,children:[(0,m.jsx)(`h1`,{className:`text-3xl font-bold`,children:`SQL playground`}),(0,m.jsx)(`span`,{className:`text-sm text-ink-soft`,children:`real SQLite, in your browser`}),(0,m.jsxs)(`div`,{className:`ml-auto flex items-center gap-1.5`,children:[[`ecommerce`,`employees`].map(n=>(0,m.jsx)(`button`,{onClick:()=>{t(n),y(null),h({status:`idle`})},className:`rounded-full border px-3 py-1 text-sm ${e===n?`border-accent bg-accent text-white`:`border-line text-ink-soft hover:border-accent`}`,children:n},n)),(0,m.jsx)(`button`,{onClick:()=>{d(e).then(()=>w(e)),h({status:`idle`})},className:`rounded-full border border-line px-3 py-1 text-sm text-ink-soft hover:border-wrong hover:text-wrong`,title:`Re-seed the database (undoes your DROPs and DELETEs)`,children:`Reset DB`})]})]}),!n&&(0,m.jsx)(`p`,{className:`mt-4 text-sm text-ink-soft`,children:`Loading SQLite engine (~0.4 MB, cached after the first time)…`}),(0,m.jsxs)(`div`,{className:`mt-6 grid gap-6 lg:grid-cols-[13rem_1fr]`,children:[(0,m.jsxs)(`aside`,{className:`space-y-3`,children:[(0,m.jsx)(`h2`,{className:`text-xs font-semibold tracking-wide text-ink-soft uppercase`,children:`Schema`}),a.map(e=>(0,m.jsxs)(`div`,{className:`rounded-lg border border-line p-2.5`,children:[(0,m.jsx)(`p`,{className:`font-mono text-xs font-semibold`,children:e.name}),(0,m.jsx)(`ul`,{className:`mt-1 space-y-0.5`,children:e.columns.map(e=>(0,m.jsx)(`li`,{className:`font-mono text-[11px] text-ink-soft`,children:e},e))})]},e.name))]}),(0,m.jsxs)(`div`,{className:`min-w-0`,children:[(0,m.jsxs)(`div`,{className:`mb-1 flex items-baseline justify-between`,children:[(0,m.jsxs)(`span`,{className:`text-xs font-semibold tracking-wide text-ink-soft uppercase`,children:[`Exercises (`,D.length,`)`]}),(0,m.jsx)(`span`,{className:`text-xs text-ink-soft`,children:`pick one, write the query, hit Check`})]}),(0,m.jsx)(`div`,{className:`flex max-h-28 flex-wrap gap-1.5 overflow-y-auto rounded-lg border border-line bg-raised/40 p-2`,children:D.map(e=>(0,m.jsx)(`button`,{onClick:()=>{y(v?.id===e.id?null:e),x(null),C(!1)},className:`rounded-full border px-2.5 py-0.5 text-xs ${v?.id===e.id?`border-accent bg-accent text-white`:`border-line text-ink-soft hover:border-accent`}`,children:e.title},e.id))}),v&&(0,m.jsxs)(`div`,{className:`mt-3 rounded-lg border-l-[3px] border-accent bg-raised px-4 py-3`,children:[(0,m.jsx)(`p`,{className:`text-[15px]`,children:v.prompt}),(0,m.jsxs)(`div`,{className:`mt-2 flex items-center gap-3 text-sm`,children:[(0,m.jsx)(`button`,{onClick:()=>void E(),className:`rounded-md bg-accent px-3 py-1 font-medium text-white hover:bg-accent/90`,children:`Check my query`}),v.hint&&(0,m.jsx)(`button`,{onClick:()=>C(!S),className:`text-accent hover:underline`,children:S?`Hide hint`:`Hint`}),b?.verdict===`pass`&&(0,m.jsx)(`span`,{className:`font-medium text-correct`,children:`✓ Correct`}),b?.verdict===`fail`&&(0,m.jsx)(`span`,{className:`font-medium text-wrong`,children:`Not yet — expected result below`})]}),S&&v.hint&&(0,m.jsx)(`p`,{className:`mt-2 text-sm text-ink-soft`,children:v.hint})]}),(0,m.jsx)(`textarea`,{value:s,onChange:e=>c(e.target.value),onKeyDown:e=>{(e.ctrlKey||e.metaKey)&&e.key===`Enter`&&(e.preventDefault(),T())},spellCheck:!1,rows:7,className:`mt-4 w-full resize-y rounded-lg border border-line bg-bg p-3 font-mono text-sm leading-relaxed focus:border-accent focus:outline-none`,placeholder:`SELECT …`}),(0,m.jsxs)(`div`,{className:`mt-2 flex items-center gap-3`,children:[(0,m.jsx)(`button`,{onClick:()=>void T(),disabled:!n,className:`rounded-lg bg-accent px-4 py-1.5 font-medium text-white hover:bg-accent/90 disabled:opacity-50`,children:`Run`}),(0,m.jsx)(`span`,{className:`text-xs text-ink-soft`,children:`Ctrl+Enter runs. Mutations stick until Reset DB.`}),l.status===`ok`&&(0,m.jsxs)(`span`,{className:`ml-auto font-mono text-xs text-ink-soft`,children:[l.ms,` ms`]})]}),(0,m.jsxs)(`div`,{className:`mt-4 space-y-4`,children:[l.status===`error`&&(0,m.jsx)(`div`,{className:`rounded-lg border border-wrong bg-wrong/5 px-4 py-3`,children:(0,m.jsx)(`p`,{className:`font-mono text-sm text-wrong`,children:l.message})}),l.status===`ok`&&l.results.length===0&&(0,m.jsx)(`p`,{className:`text-sm text-ink-soft`,children:`Statement ran — no rows to show (DDL/INSERT/UPDATE).`}),l.status===`ok`&&l.results.map((e,t)=>(0,m.jsx)(_,{r:e},t)),b?.verdict===`fail`&&(0,m.jsxs)(`div`,{children:[(0,m.jsxs)(`p`,{className:`mb-1 text-sm font-medium text-ink-soft`,children:[`Expected result`,v?.ordered?` (order matters here)`:` (any row order)`,`:`]}),b.expected?(0,m.jsx)(_,{r:b.expected}):(0,m.jsx)(`p`,{className:`text-sm text-ink-soft`,children:`an empty result`})]})]})]})]})]})}export{v as Component};