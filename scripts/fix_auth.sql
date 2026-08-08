ALTER USER 'root'@'localhost' IDENTIFIED BY 'Kelawalla@2004';
ALTER USER 'felliro_user'@'localhost' IDENTIFIED BY 'Kelawalla@2004';
GRANT ALL PRIVILEGES ON *.* TO 'root'@'localhost' WITH GRANT OPTION;
GRANT ALL PRIVILEGES ON felliro_db.* TO 'felliro_user'@'localhost';
FLUSH PRIVILEGES;
