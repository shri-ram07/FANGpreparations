-- E-commerce sample DB. Deliberate teaching features:
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
