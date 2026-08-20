-- Employees sample DB — the classic interview schema. Teaching features:
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
