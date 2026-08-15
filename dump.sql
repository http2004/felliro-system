-- MySQL dump 10.13  Distrib 8.4.10, for Linux (x86_64)
--
-- Host: localhost    Database: felliro_db
-- ------------------------------------------------------
-- Server version	8.4.10-0ubuntu0.26.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `categories`
--

DROP TABLE IF EXISTS `categories`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `categories` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `parent_id` int DEFAULT NULL,
  `description` text COLLATE utf8mb4_general_ci,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `parent_id` (`parent_id`),
  CONSTRAINT `categories_ibfk_1` FOREIGN KEY (`parent_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `categories`
--

LOCK TABLES `categories` WRITE;
/*!40000 ALTER TABLE `categories` DISABLE KEYS */;
INSERT INTO `categories` VALUES (16,'Crop Top',NULL,'','2026-08-08 08:57:29','2026-08-08 08:57:29'),(17,'Coart',NULL,'','2026-08-08 08:57:29','2026-08-08 08:57:29'),(19,'Frock',NULL,'','2026-08-08 08:57:29','2026-08-08 08:57:29'),(20,'Full Kit',NULL,'','2026-08-08 08:57:29','2026-08-08 08:57:29'),(21,'Night Dress',NULL,'','2026-08-08 08:57:29','2026-08-08 08:57:29');
/*!40000 ALTER TABLE `categories` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `email_logs`
--

DROP TABLE IF EXISTS `email_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `email_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `recipient` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `subject` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `template` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `content` text COLLATE utf8mb4_general_ci,
  `status` enum('sent','failed') COLLATE utf8mb4_general_ci DEFAULT 'sent',
  `reference_type` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `reference_id` int DEFAULT NULL,
  `error_message` text COLLATE utf8mb4_general_ci,
  `sent_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `email_logs`
--

LOCK TABLES `email_logs` WRITE;
/*!40000 ALTER TABLE `email_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `email_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `inventory_logs`
--

DROP TABLE IF EXISTS `inventory_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `inventory_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `product_id` int DEFAULT '0',
  `previous_quantity` int DEFAULT NULL,
  `new_quantity` int DEFAULT NULL,
  `change_type` enum('purchase','sale','return','damage','adjustment') COLLATE utf8mb4_general_ci NOT NULL,
  `reference_id` int DEFAULT NULL,
  `note` text COLLATE utf8mb4_general_ci,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `product_id` (`product_id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `inventory_logs_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `inventory_logs_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=203 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `inventory_logs`
--

LOCK TABLES `inventory_logs` WRITE;
/*!40000 ALTER TABLE `inventory_logs` DISABLE KEYS */;
INSERT INTO `inventory_logs` VALUES (1,49,72,71,'sale',NULL,'Sale on Order FELLIRO-2026-4192',NULL,'2026-08-08 08:57:29'),(2,49,0,1,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-4192',1,'2026-08-08 08:57:29'),(3,50,25,24,'sale',NULL,'Sale on Order FELLIRO-2026-8995',NULL,'2026-08-08 08:57:29'),(4,50,24,23,'sale',NULL,'Sale on Order FELLIRO-2026-9963',NULL,'2026-08-08 08:57:29'),(5,50,23,22,'sale',NULL,'Sale on Order FELLIRO-2026-9195',NULL,'2026-08-08 08:57:29'),(6,50,0,1,'return',NULL,'Stock restored from cancelled Order #FELLIRO-2026-9195',1,'2026-08-08 08:57:29'),(7,50,0,1,'return',NULL,'Stock restored from cancelled Order #FELLIRO-2026-9963',1,'2026-08-08 08:57:29'),(8,50,0,1,'return',NULL,'Stock restored from cancelled Order #FELLIRO-2026-9195',1,'2026-08-08 08:57:29'),(9,50,0,1,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-9963',1,'2026-08-08 08:57:29'),(10,50,0,1,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-8995',1,'2026-08-08 08:57:29'),(11,49,72,71,'sale',NULL,'Sale on Order FELLIRO-2026-6292',NULL,'2026-08-08 08:57:29'),(12,48,90,88,'sale',NULL,'Sale on Order FELLIRO-2026-6292',NULL,'2026-08-08 08:57:29'),(13,49,71,70,'sale',NULL,'Sale on Order FELLIRO-2026-1288',NULL,'2026-08-08 08:57:29'),(14,48,88,86,'sale',NULL,'Sale on Order FELLIRO-2026-1288',NULL,'2026-08-08 08:57:29'),(15,49,70,69,'sale',NULL,'Sale on Order FELLIRO-2026-1919',NULL,'2026-08-08 08:57:29'),(16,48,86,84,'sale',NULL,'Sale on Order FELLIRO-2026-1919',NULL,'2026-08-08 08:57:29'),(17,49,69,68,'sale',NULL,'Sale on Order FELLIRO-2026-1153',NULL,'2026-08-08 08:57:29'),(18,48,84,82,'sale',NULL,'Sale on Order FELLIRO-2026-1153',NULL,'2026-08-08 08:57:29'),(19,49,68,67,'sale',NULL,'Sale on Order FELLIRO-2026-6626',NULL,'2026-08-08 08:57:29'),(20,48,82,80,'sale',NULL,'Sale on Order FELLIRO-2026-6626',NULL,'2026-08-08 08:57:29'),(21,49,67,66,'sale',NULL,'Sale on Order FELLIRO-2026-2319',NULL,'2026-08-08 08:57:29'),(22,48,80,78,'sale',NULL,'Sale on Order FELLIRO-2026-2319',NULL,'2026-08-08 08:57:29'),(23,49,66,65,'sale',NULL,'Sale on Order FELLIRO-2026-9036',NULL,'2026-08-08 08:57:29'),(24,48,78,76,'sale',NULL,'Sale on Order FELLIRO-2026-9036',NULL,'2026-08-08 08:57:29'),(25,49,65,64,'sale',NULL,'Sale on Order FELLIRO-2026-3707',NULL,'2026-08-08 08:57:29'),(26,48,76,74,'sale',NULL,'Sale on Order FELLIRO-2026-3707',NULL,'2026-08-08 08:57:29'),(27,49,64,63,'sale',NULL,'Sale on Order FELLIRO-2026-3297',NULL,'2026-08-08 08:57:29'),(28,48,74,72,'sale',NULL,'Sale on Order FELLIRO-2026-3297',NULL,'2026-08-08 08:57:29'),(29,49,63,62,'sale',NULL,'Sale on Order FELLIRO-2026-8317',NULL,'2026-08-08 08:57:29'),(30,48,72,70,'sale',NULL,'Sale on Order FELLIRO-2026-8317',NULL,'2026-08-08 08:57:29'),(31,49,62,61,'sale',NULL,'Sale on Order FELLIRO-2026-7488',NULL,'2026-08-08 08:57:29'),(32,48,70,68,'sale',NULL,'Sale on Order FELLIRO-2026-7488',NULL,'2026-08-08 08:57:29'),(33,49,61,60,'sale',NULL,'Sale on Order FELLIRO-2026-2676',NULL,'2026-08-08 08:57:29'),(34,48,68,66,'sale',NULL,'Sale on Order FELLIRO-2026-2676',NULL,'2026-08-08 08:57:29'),(35,49,60,59,'sale',NULL,'Sale on Order FELLIRO-2026-2459',NULL,'2026-08-08 08:57:29'),(36,48,66,64,'sale',NULL,'Sale on Order FELLIRO-2026-2459',NULL,'2026-08-08 08:57:29'),(37,49,59,58,'sale',NULL,'Sale on Order FELLIRO-2026-1037',NULL,'2026-08-08 08:57:29'),(38,48,64,62,'sale',NULL,'Sale on Order FELLIRO-2026-1037',NULL,'2026-08-08 08:57:29'),(39,49,58,57,'sale',NULL,'Sale on Order FELLIRO-2026-1879',NULL,'2026-08-08 08:57:29'),(40,48,62,60,'sale',NULL,'Sale on Order FELLIRO-2026-1879',NULL,'2026-08-08 08:57:29'),(42,50,27,26,'sale',NULL,'Sale on Order FELLIRO-2026-3937',NULL,'2026-08-08 08:57:29'),(43,50,26,25,'sale',NULL,'Sale on Order FELLIRO-2026-4772',NULL,'2026-08-08 08:57:29'),(44,49,57,55,'sale',NULL,'Sale on Order FELLIRO-2026-4772',NULL,'2026-08-08 08:57:29'),(45,48,60,59,'sale',NULL,'Sale on Order FELLIRO-2026-4772',NULL,'2026-08-08 08:57:29'),(46,50,0,1,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-4772',1,'2026-08-08 08:57:29'),(47,49,0,2,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-4772',1,'2026-08-08 08:57:29'),(48,48,0,1,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-4772',1,'2026-08-08 08:57:29'),(49,50,0,1,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-3937',1,'2026-08-08 08:57:29'),(50,49,0,1,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-1879',1,'2026-08-08 08:57:29'),(51,48,0,2,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-1879',1,'2026-08-08 08:57:29'),(52,49,0,1,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-1037',1,'2026-08-08 08:57:29'),(53,48,0,2,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-1037',1,'2026-08-08 08:57:29'),(54,49,0,1,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-2459',1,'2026-08-08 08:57:29'),(55,48,0,2,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-2459',1,'2026-08-08 08:57:29'),(56,49,0,1,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-2676',1,'2026-08-08 08:57:29'),(57,48,0,2,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-2676',1,'2026-08-08 08:57:29'),(58,49,0,1,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-7488',1,'2026-08-08 08:57:29'),(59,48,0,2,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-7488',1,'2026-08-08 08:57:29'),(60,49,0,1,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-8317',1,'2026-08-08 08:57:29'),(61,48,0,2,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-8317',1,'2026-08-08 08:57:29'),(62,49,0,1,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-3297',1,'2026-08-08 08:57:29'),(63,48,0,2,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-3297',1,'2026-08-08 08:57:29'),(64,49,0,1,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-3707',1,'2026-08-08 08:57:29'),(65,48,0,2,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-3707',1,'2026-08-08 08:57:29'),(66,49,0,1,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-9036',1,'2026-08-08 08:57:29'),(67,48,0,2,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-9036',1,'2026-08-08 08:57:29'),(68,49,0,1,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-2319',1,'2026-08-08 08:57:29'),(69,48,0,2,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-2319',1,'2026-08-08 08:57:29'),(70,49,0,1,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-6626',1,'2026-08-08 08:57:29'),(71,48,0,2,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-6626',1,'2026-08-08 08:57:29'),(72,49,0,1,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-1153',1,'2026-08-08 08:57:29'),(73,48,0,2,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-1153',1,'2026-08-08 08:57:29'),(74,49,0,1,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-1919',1,'2026-08-08 08:57:29'),(75,48,0,2,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-1919',1,'2026-08-08 08:57:29'),(76,49,0,1,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-1288',1,'2026-08-08 08:57:29'),(77,48,0,2,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-1288',1,'2026-08-08 08:57:29'),(78,49,0,1,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-6292',1,'2026-08-08 08:57:29'),(79,48,0,2,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-6292',1,'2026-08-08 08:57:29'),(80,49,72,71,'sale',NULL,'Sale on Order FELLIRO-2026-5836',NULL,'2026-08-08 08:57:29'),(81,49,0,1,'return',NULL,'Stock restored from cancelled Order #FELLIRO-2026-5836',1,'2026-08-08 08:57:29'),(82,49,72,70,'sale',NULL,'Sale on Order FELLIRO-2026-4810',NULL,'2026-08-08 08:57:29'),(83,48,90,88,'sale',NULL,'Sale on Order FELLIRO-2026-4810',NULL,'2026-08-08 08:57:29'),(84,49,0,2,'return',NULL,'Stock restored from cancelled Order #FELLIRO-2026-4810',1,'2026-08-08 08:57:29'),(85,48,0,2,'return',NULL,'Stock restored from cancelled Order #FELLIRO-2026-4810',1,'2026-08-08 08:57:29'),(86,50,27,26,'sale',NULL,'Sale on Order FELLIRO-2026-7244',NULL,'2026-08-08 08:57:29'),(87,50,0,1,'return',NULL,'Restocked from Customer Return (Order ID #45, Size: S, Color: Red)',1,'2026-08-08 08:57:29'),(88,50,0,1,'return',NULL,'Restocked from Customer Return (Order ID #45, Size: S, Color: Red)',1,'2026-08-08 08:57:29'),(89,50,0,1,'return',NULL,'Restocked from Customer Return (Order ID #45, Size: S, Color: Red)',1,'2026-08-08 08:57:29'),(90,50,0,1,'return',NULL,'Restocked from Customer Return (Order ID #45, Size: S, Color: Red)',1,'2026-08-08 08:57:29'),(91,48,0,1,'return',NULL,'Restocked from Customer Return (Order ID #44, Size: S, Color: Black)',1,'2026-08-08 08:57:29'),(92,48,0,1,'return',NULL,'Restocked from Customer Return (Order ID #44, Size: S, Color: Black)',1,'2026-08-08 08:57:29'),(93,50,0,1,'return',NULL,'Restocked from Customer Return (Order ID #45, Size: S, Color: Red)',1,'2026-08-08 08:57:29'),(94,49,72,71,'sale',NULL,'Sale on Order FELLIRO-2026-3289',NULL,'2026-08-08 08:57:29'),(95,48,92,91,'sale',NULL,'Sale on Order FELLIRO-2026-2069',NULL,'2026-08-08 08:57:29'),(96,49,71,70,'sale',NULL,'Sale on Order FELLIRO-2026-2069',NULL,'2026-08-08 08:57:29'),(97,49,0,1,'return',NULL,'Stock restored from cancelled Order #FELLIRO-2026-7801',1,'2026-08-08 08:57:29'),(98,49,0,1,'return',NULL,'Stock restored from cancelled Order #FELLIRO-2026-7801',1,'2026-08-08 08:57:29'),(99,49,70,69,'sale',NULL,'Sale on Order FELLIRO-2026-6073',NULL,'2026-08-08 08:57:29'),(100,48,0,1,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-3931',1,'2026-08-08 08:57:29'),(101,49,69,67,'sale',NULL,'Bot Order FELLIRO-2026-8568',NULL,'2026-08-08 08:57:29'),(102,49,0,2,'return',NULL,'Stock restored from cancelled Order #FELLIRO-2026-8568',1,'2026-08-08 08:57:29'),(103,50,30,29,'sale',NULL,'Bot Order FELLIRO-2026-7954',NULL,'2026-08-08 08:57:29'),(104,48,62,61,'sale',NULL,'Bot Order FELLIRO-2026-4364',NULL,'2026-08-08 08:57:29'),(105,49,39,38,'sale',NULL,'Sale on Order FELLIRO-2026-7783',NULL,'2026-08-08 08:57:29'),(106,49,0,1,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-7783',1,'2026-08-08 08:57:29'),(107,49,39,38,'sale',NULL,'Bot Order FELLIRO-2026-9123',NULL,'2026-08-08 08:57:29'),(108,50,29,28,'sale',NULL,'Bot Order FELLIRO-2026-2445',NULL,'2026-08-08 08:57:29'),(109,50,28,27,'sale',NULL,'Bot Order FELLIRO-2026-7280',NULL,'2026-08-08 08:57:29'),(110,49,38,37,'sale',NULL,'Bot Order FELLIRO-2026-3804',NULL,'2026-08-08 08:57:29'),(111,48,61,60,'sale',NULL,'Bot Order FELLIRO-2026-6432',NULL,'2026-08-08 08:57:29'),(112,48,60,59,'sale',NULL,'Bot Order FELLIRO-2026-5106',NULL,'2026-08-08 08:57:29'),(113,48,59,57,'sale',NULL,'Bot Order FELLIRO-2026-5795',NULL,'2026-08-08 08:57:29'),(114,48,0,1,'return',NULL,'Stock restored from cancelled Order #FELLIRO-2026-2563',1,'2026-08-08 08:57:29'),(115,48,58,55,'sale',NULL,'WhatsApp Bot Order FELLIRO-2026-8242',NULL,'2026-08-08 08:57:29'),(116,49,37,35,'sale',NULL,'WhatsApp Bot Order FELLIRO-2026-3506',NULL,'2026-08-08 08:57:29'),(117,49,35,33,'sale',NULL,'WhatsApp Bot Order FELLIRO-2026-3506',NULL,'2026-08-08 08:57:29'),(118,48,0,3,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-8242',1,'2026-08-08 08:57:29'),(119,49,0,2,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-3506',1,'2026-08-08 08:57:29'),(120,49,0,2,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-3506',1,'2026-08-08 08:57:29'),(121,48,58,57,'sale',NULL,'WhatsApp Bot Order FELLIRO-2026-5083',NULL,'2026-08-08 08:57:29'),(122,48,57,56,'sale',NULL,'WhatsApp Bot Order FELLIRO-2026-6594',NULL,'2026-08-08 08:57:29'),(123,48,56,55,'sale',NULL,'WhatsApp Bot Order FELLIRO-2026-4490',NULL,'2026-08-08 08:57:29'),(124,48,55,54,'sale',NULL,'WhatsApp Bot Order FELLIRO-2026-5767',NULL,'2026-08-08 08:57:29'),(125,48,54,53,'sale',NULL,'WhatsApp Bot Order FELLIRO-2026-9600',NULL,'2026-08-08 08:57:29'),(126,48,53,52,'sale',NULL,'WhatsApp Bot Order FELLIRO-2026-5688',NULL,'2026-08-08 08:57:29'),(127,48,52,51,'sale',NULL,'WhatsApp Bot Order FELLIRO-2026-3902',NULL,'2026-08-08 08:57:29'),(128,48,51,50,'sale',NULL,'WhatsApp Bot Order FELLIRO-2026-3369',NULL,'2026-08-08 08:57:29'),(129,48,50,49,'sale',NULL,'WhatsApp Bot Order FELLIRO-2026-4905',NULL,'2026-08-08 08:57:29'),(130,48,49,48,'sale',NULL,'WhatsApp Bot Order FELLIRO-2026-7982',NULL,'2026-08-08 08:57:29'),(131,48,48,47,'sale',NULL,'WhatsApp Bot Order FELLIRO-2026-5062',NULL,'2026-08-08 08:57:29'),(132,48,0,1,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-5062',1,'2026-08-08 08:57:29'),(133,48,0,1,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-7982',1,'2026-08-08 08:57:29'),(134,48,0,1,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-4905',1,'2026-08-08 08:57:29'),(135,48,0,1,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-3369',1,'2026-08-08 08:57:29'),(136,48,0,1,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-3902',1,'2026-08-08 08:57:29'),(137,48,0,1,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-5688',1,'2026-08-08 08:57:29'),(138,48,0,1,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-9600',1,'2026-08-08 08:57:29'),(139,48,0,1,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-5767',1,'2026-08-08 08:57:29'),(140,48,0,1,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-4490',1,'2026-08-08 08:57:29'),(141,48,0,1,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-6594',1,'2026-08-08 08:57:29'),(142,48,0,1,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-5083',1,'2026-08-08 08:57:29'),(143,48,0,1,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-9580',1,'2026-08-08 08:57:29'),(144,48,0,1,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-3029',1,'2026-08-08 08:57:29'),(145,48,0,1,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-3076',1,'2026-08-08 08:57:29'),(146,48,0,1,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-1213',1,'2026-08-08 08:57:29'),(147,49,0,1,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-6969',1,'2026-08-08 08:57:29'),(148,48,0,2,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-5795',1,'2026-08-08 08:57:29'),(149,48,0,1,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-5106',1,'2026-08-08 08:57:29'),(150,48,0,1,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-6432',1,'2026-08-08 08:57:29'),(151,49,0,1,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-3804',1,'2026-08-08 08:57:29'),(152,50,0,1,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-7280',1,'2026-08-08 08:57:29'),(153,50,0,1,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-2445',1,'2026-08-08 08:57:29'),(154,49,0,1,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-9123',1,'2026-08-08 08:57:29'),(155,48,0,1,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-4364',1,'2026-08-08 08:57:29'),(156,50,0,1,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-7954',1,'2026-08-08 08:57:29'),(157,49,0,2,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-8568',1,'2026-08-08 08:57:29'),(158,49,0,1,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-6073',1,'2026-08-08 08:57:29'),(159,50,0,1,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-9505',1,'2026-08-08 08:57:29'),(160,49,0,1,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-4554',1,'2026-08-08 08:57:29'),(161,48,0,1,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-2069',1,'2026-08-08 08:57:29'),(162,49,0,1,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-2069',1,'2026-08-08 08:57:29'),(163,49,0,1,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-3289',1,'2026-08-08 08:57:29'),(164,50,0,0,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-7244',1,'2026-08-08 08:57:29'),(165,49,0,2,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-4810',1,'2026-08-08 08:57:29'),(166,48,0,1,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-4810',1,'2026-08-08 08:57:29'),(167,49,0,2,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-9992',1,'2026-08-08 08:57:29'),(168,48,0,1,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-1650',1,'2026-08-08 08:57:29'),(169,48,0,1,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-3951',1,'2026-08-08 08:57:29'),(170,48,0,1,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-3701',1,'2026-08-08 08:57:29'),(171,48,0,1,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-1881',1,'2026-08-08 08:57:29'),(172,48,0,1,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-5793',1,'2026-08-08 08:57:29'),(173,49,0,1,'return',NULL,'Stock restored from cancelled Order #FELLIRO-2026-3261',1,'2026-08-08 08:57:29'),(174,49,0,1,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-3261',1,'2026-08-08 08:57:29'),(175,49,52,50,'sale',92,'Sale on WhatsApp Order #FELLIRO-2026-3015',NULL,'2026-08-02 05:47:17'),(176,50,31,30,'sale',93,'Sale on WhatsApp Order #FELLIRO-2026-5405',NULL,'2026-08-02 05:54:37'),(177,50,30,29,'sale',94,'Sale on WhatsApp Order #FELLIRO-2026-4966',NULL,'2026-08-02 06:06:45'),(178,50,29,27,'sale',NULL,'Sale on Order FELLIRO-2026-4159',NULL,'2026-08-08 08:57:29'),(179,50,0,2,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-4159',1,'2026-08-08 08:57:29'),(180,50,0,1,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-4966',1,'2026-08-08 08:57:29'),(181,50,0,1,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-5405',1,'2026-08-08 08:57:29'),(182,49,0,2,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-3015',1,'2026-08-08 08:57:29'),(183,61,20,19,'sale',96,'Sale on WhatsApp Order #FELLIRO-2026-1427',NULL,'2026-08-02 17:15:32'),(184,61,19,18,'sale',97,'Sale on WhatsApp Order #FELLIRO-2026-6492',NULL,'2026-08-02 17:33:38'),(185,61,9,8,'sale',98,'Sale on WhatsApp Order #FELLIRO-2026-7757 (Pink / Free)',NULL,'2026-08-02 18:41:47'),(186,61,0,1,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-7757',1,'2026-08-08 08:57:29'),(187,61,0,1,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-6492',1,'2026-08-08 08:57:29'),(188,61,0,1,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-1427',1,'2026-08-08 08:57:29'),(189,88,20,19,'sale',99,'Sale on WhatsApp Order #FELLIRO-2026-5950 (Black / Free)',NULL,'2026-08-03 02:09:34'),(190,88,0,1,'return',NULL,'Stock restored from cancelled Order #FELLIRO-2026-5950',1,'2026-08-08 08:57:29'),(191,65,10,9,'sale',100,'Sale on WhatsApp Order #FELLIRO-2026-4469 (Black / Free)',NULL,'2026-08-05 00:36:45'),(192,89,20,19,'sale',101,'Sale on WhatsApp Order #FELLIRO-2026-3508 (Black / Free)',NULL,'2026-08-05 00:46:17'),(193,89,0,1,'return',NULL,'Stock restored from cancelled Order #FELLIRO-2026-3508',1,'2026-08-08 08:57:29'),(194,86,20,19,'sale',102,'Sale on WhatsApp Order #FELLIRO-2026-7386 (Red / Free)',NULL,'2026-08-05 01:58:11'),(195,86,0,1,'return',NULL,'Stock restored from cancelled Order #FELLIRO-2026-7386',1,'2026-08-08 08:57:29'),(196,89,20,19,'sale',NULL,'Sale on Order FELLIRO-2026-2027 (Black Free)',NULL,'2026-08-08 08:57:29'),(197,89,0,1,'return',NULL,'Stock restored from cancelled Order #FELLIRO-2026-2027',1,'2026-08-08 08:57:29'),(198,89,0,1,'return',NULL,'Stock restored from cancelled Order #FELLIRO-2026-3508',1,'2026-08-08 09:30:20'),(199,65,0,1,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-4469',1,'2026-08-08 09:30:26'),(200,88,20,19,'sale',104,'Sale on WhatsApp Order #FELLIRO-2026-7999 (Black / Free)',NULL,'2026-08-08 11:50:47'),(201,88,0,1,'return',NULL,'Stock restored from cancelled Order #FELLIRO-2026-7999',1,'2026-08-08 12:07:04'),(202,88,0,1,'adjustment',NULL,'Stock restored from deleted Order #FELLIRO-2026-7999',1,'2026-08-08 12:23:14');
/*!40000 ALTER TABLE `inventory_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `order_items`
--

DROP TABLE IF EXISTS `order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `order_items` (
  `id` int NOT NULL AUTO_INCREMENT,
  `order_id` int DEFAULT '0',
  `product_id` int DEFAULT '0',
  `quantity` int DEFAULT '0',
  `price` decimal(10,2) DEFAULT '0.00',
  `discount` decimal(10,2) DEFAULT '0.00',
  `total` decimal(10,2) DEFAULT '0.00',
  `size` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `color` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `order_id` (`order_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `order_items_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `order_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=145 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `order_items`
--

LOCK TABLES `order_items` WRITE;
/*!40000 ALTER TABLE `order_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `order_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `order_receipts`
--

DROP TABLE IF EXISTS `order_receipts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `order_receipts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `order_id` int DEFAULT '0',
  `file_path` varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `file_type` varchar(50) COLLATE utf8mb4_general_ci DEFAULT 'image',
  `uploaded_via` varchar(20) COLLATE utf8mb4_general_ci DEFAULT 'whatsapp',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `order_id` (`order_id`),
  CONSTRAINT `order_receipts_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `order_receipts`
--

LOCK TABLES `order_receipts` WRITE;
/*!40000 ALTER TABLE `order_receipts` DISABLE KEYS */;
/*!40000 ALTER TABLE `order_receipts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `order_status_history`
--

DROP TABLE IF EXISTS `order_status_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `order_status_history` (
  `id` int NOT NULL AUTO_INCREMENT,
  `order_id` int DEFAULT '0',
  `status` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `note` text COLLATE utf8mb4_general_ci,
  `updated_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `order_id` (`order_id`),
  KEY `updated_by` (`updated_by`),
  CONSTRAINT `order_status_history_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `order_status_history_ibfk_2` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=204 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `order_status_history`
--

LOCK TABLES `order_status_history` WRITE;
/*!40000 ALTER TABLE `order_status_history` DISABLE KEYS */;
/*!40000 ALTER TABLE `order_status_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `orders`
--

DROP TABLE IF EXISTS `orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `orders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `order_number` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `customer_id` int DEFAULT NULL,
  `customer_name` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `customer_phone` varchar(15) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `customer_email` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `customer_address` text COLLATE utf8mb4_general_ci,
  `city` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `province` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `total_amount` decimal(10,2) DEFAULT '0.00',
  `discount` decimal(10,2) DEFAULT '0.00',
  `tax` decimal(10,2) DEFAULT '0.00',
  `net_amount` decimal(10,2) DEFAULT '0.00',
  `delivery_fee` decimal(10,2) DEFAULT '0.00',
  `payment_method` enum('cash','bank_transfer','whatsapp','cod') COLLATE utf8mb4_general_ci DEFAULT 'whatsapp',
  `payment_status` enum('pending','paid','failed') COLLATE utf8mb4_general_ci DEFAULT 'pending',
  `receipt_url` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `order_status` enum('pending','processing','ready_for_dispatch','handed_to_courier','in_transit','delivered','cancelled') COLLATE utf8mb4_general_ci DEFAULT 'pending',
  `tracking_number` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `delivery_notes` text COLLATE utf8mb4_general_ci,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `whatsapp_id` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `order_number` (`order_number`),
  KEY `customer_id` (`customer_id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `orders_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `orders_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=105 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `orders`
--

LOCK TABLES `orders` WRITE;
/*!40000 ALTER TABLE `orders` DISABLE KEYS */;
/*!40000 ALTER TABLE `orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_images`
--

DROP TABLE IF EXISTS `product_images`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_images` (
  `id` int NOT NULL AUTO_INCREMENT,
  `product_id` int DEFAULT '0',
  `image_url` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `is_primary` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `product_images_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=48 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_images`
--

LOCK TABLES `product_images` WRITE;
/*!40000 ALTER TABLE `product_images` DISABLE KEYS */;
INSERT INTO `product_images` VALUES (1,48,'/uploads/product-1785074883107-526350104.webp',1,'2026-08-08 08:57:30'),(2,49,'/uploads/product-1785076312448-461659884.webp',1,'2026-08-08 08:57:30'),(3,50,'/uploads/product-1785076488588-760790526.jpg',1,'2026-08-08 08:57:30'),(4,51,'/uploads/product-1785407187693-379590927.jpg',1,'2026-08-08 08:57:30'),(5,52,'/uploads/product-1785515020960-401095932.jpg',1,'2026-08-08 08:57:30'),(6,53,'/uploads/product-1785634252728-23154063.jpg',1,'2026-08-08 08:57:30'),(7,54,'/uploads/product-1785634257563-630141715.jpg',1,'2026-08-08 08:57:30'),(8,55,'/uploads/product-1785634258331-62465390.jpg',1,'2026-08-08 08:57:30'),(9,56,'/uploads/product-1785634258906-883230603.jpg',1,'2026-08-08 08:57:30'),(10,57,'/uploads/product-1785634259242-28420081.jpg',1,'2026-08-08 08:57:30'),(11,58,'/uploads/product-1785634259410-118948696.jpg',1,'2026-08-08 08:57:30'),(12,59,'/uploads/product-1785634277169-457239823.jpg',1,'2026-08-08 08:57:30'),(13,60,'/uploads/product-1785634922531-474791659.png',1,'2026-08-08 08:57:30'),(14,61,'/uploads/product-1785670406249-583190102.png',1,'2026-08-08 08:57:30'),(15,62,'/uploads/product-1785685009201-609684462.png',1,'2026-08-08 08:57:30'),(16,63,'/uploads/product-1785685163077-771110396.png',1,'2026-08-08 08:57:30'),(17,64,'/uploads/product-1785685340369-262333286.png',1,'2026-08-08 08:57:30'),(18,65,'/uploads/product-1785685465822-291413045.png',1,'2026-08-08 08:57:30'),(19,66,'/uploads/product-1785685670691-218726306.png',1,'2026-08-08 08:57:30'),(20,67,'/uploads/product-1785685750059-736142606.png',1,'2026-08-08 08:57:30'),(21,68,'/uploads/product-1785685942676-945620832.png',1,'2026-08-08 08:57:30'),(22,69,'/uploads/product-1785686075557-934732035.png',1,'2026-08-08 08:57:30'),(23,70,'/uploads/product-1785686273846-292700808.png',1,'2026-08-08 08:57:30'),(24,71,'/uploads/product-1785686425908-848811208.png',1,'2026-08-08 08:57:30'),(25,72,'/uploads/product-1785686525463-184941022.png',1,'2026-08-08 08:57:30'),(26,73,'/uploads/product-1785686613107-785238295.png',1,'2026-08-08 08:57:30'),(27,74,'/uploads/product-1785686716272-565033968.png',1,'2026-08-08 08:57:30'),(28,75,'/uploads/product-1785686774127-666617387.png',1,'2026-08-08 08:57:30'),(29,76,'/uploads/product-1785686857011-324615289.png',1,'2026-08-08 08:57:30'),(30,77,'/uploads/product-1785686938376-513717827.png',1,'2026-08-08 08:57:30'),(31,78,'/uploads/product-1785687012011-352048342.png',1,'2026-08-08 08:57:30'),(32,79,'/uploads/product-1785687152815-171194189.png',1,'2026-08-08 08:57:30'),(33,80,'/uploads/product-1785687216735-16200836.png',1,'2026-08-08 08:57:30'),(34,81,'/uploads/product-1785687275742-164118412.png',1,'2026-08-08 08:57:30'),(35,82,'/uploads/product-1785687367953-255086474.png',1,'2026-08-08 08:57:30'),(36,83,'/uploads/product-1785687405746-980068990.png',1,'2026-08-08 08:57:30'),(37,84,'/uploads/product-1785687928957-228804052.png',1,'2026-08-08 08:57:30'),(38,85,'/uploads/product-1785688014981-578238884.png',1,'2026-08-08 08:57:30'),(39,86,'/uploads/product-1785688099015-861427956.png',1,'2026-08-08 08:57:30'),(40,87,'/uploads/product-1785688491048-831607295.png',1,'2026-08-08 08:57:30'),(41,88,'/uploads/product-1785688626584-93611374.png',1,'2026-08-08 08:57:30'),(42,89,'/uploads/product-1785688748769-247573851.png',1,'2026-08-08 08:57:30'),(43,90,'/uploads/product-1785688873337-242369543.png',1,'2026-08-08 08:57:30'),(44,91,'/uploads/product-1785689015914-750810356.png',1,'2026-08-08 08:57:30'),(45,92,'/uploads/product-1785689198187-742800504.png',1,'2026-08-08 08:57:30'),(46,93,'/uploads/product-1785689582212-636686905.png',1,'2026-08-08 08:57:30'),(47,94,'/uploads/product-1785689620821-503996803.png',1,'2026-08-08 08:57:30');
/*!40000 ALTER TABLE `product_images` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_variants`
--

DROP TABLE IF EXISTS `product_variants`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_variants` (
  `id` int NOT NULL AUTO_INCREMENT,
  `product_id` int DEFAULT '0',
  `size` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `color` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `quantity` int DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `product_variants_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=272 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_variants`
--

LOCK TABLES `product_variants` WRITE;
/*!40000 ALTER TABLE `product_variants` DISABLE KEYS */;
INSERT INTO `product_variants` VALUES (7,50,'S','Red',17),(8,50,'L','Red',3),(14,51,'M','test',25),(15,51,'L','test',50),(19,48,'S','Black',24),(20,48,'M','Black',24),(21,48,'L','Black',0),(25,52,'S','Red',3),(26,52,'M','Red',0),(27,52,'L','Red',6),(28,49,'S','Red and Black',21),(29,49,'M','Red and Black',0),(30,49,'L','Red and Black',14),(31,53,'M','Blue',20),(32,53,'S','Blue',10),(33,54,'M','Blue',20),(34,54,'S','Blue',10),(35,55,'M','Blue',20),(36,55,'S','Blue',10),(37,56,'M','Blue',20),(38,56,'S','Blue',10),(41,58,'M','Blue',20),(42,58,'S','Blue',10),(43,59,'M','Blue',20),(44,59,'S','Blue',10),(49,57,'M','Blue',20),(50,57,'S','Blue',15),(53,60,'Free','Green',16),(130,84,'Free','Brown',5),(131,84,'Free','Off White',5),(132,84,'Free','Black',5),(133,84,'Free','White',5),(134,85,'Free','White',10),(135,85,'Free','Off White',5),(136,85,'Free','Black',5),(137,85,'Free','Light Brown',5),(138,86,'Free','Pink',5),(139,86,'Free','Black',5),(140,86,'Free','White',5),(141,86,'Free','Red',5),(165,92,'Free','Default',0),(166,93,'Free','Default',0),(168,94,'Free','Default',1),(169,61,'Free','Brown',5),(170,61,'Free','White',5),(171,61,'Free','Black',5),(172,61,'Free','Pink',5),(173,62,'Free','Pink',5),(174,62,'Free','Brown',5),(175,62,'Free','Navy Blue',5),(176,62,'Free','White',5),(177,63,'Free','Light greean',5),(178,63,'Free','Pink',4),(179,63,'Free','Black',1),(180,64,'Free','Blue',4),(181,64,'Free','White',5),(182,64,'Free','Black',4),(185,65,'Free','White',5),(186,65,'Free','Black',4),(187,66,'Free','Pink',4),(188,66,'Free','White',2),(189,66,'Free','Black',5),(190,67,'Free','White',5),(191,68,'Free','Purple',5),(192,68,'Free','Pink',5),(193,68,'Free','Black',5),(195,69,'Free','White',5),(196,70,'Free','Pink',5),(197,70,'Free','White',5),(198,70,'Free','Light Brown',5),(199,70,'Free','Dark Brown',5),(200,71,'Free','White',4),(201,71,'Free','Off White',3),(202,71,'Free','Black',3),(203,72,'Free','Red',4),(204,72,'Free','Black',3),(207,73,'Free','Red',10),(208,73,'Free','White',10),(209,74,'Free','Purple',5),(210,74,'Free','Pink',5),(211,75,'Free','White',5),(212,75,'Free','Black',4),(213,76,'Free','White',3),(214,76,'Free','Brown',3),(215,76,'Free','Black',6),(216,77,'Free','White',5),(217,77,'Free','Off White',5),(218,77,'Free','Pink',5),(219,78,'Free','Red',3),(220,78,'Free','Black',4),(221,78,'Free','White',3),(222,79,'Free','Off White',5),(223,79,'Free','Black',5),(224,79,'Free','Brown',5),(225,80,'Free','Red',5),(226,80,'Free','Off White',5),(227,81,'Free','White',5),(228,81,'Free','Black',5),(229,82,'Free','Pink',5),(230,82,'Free','Purple',5),(231,82,'Free','Green',5),(232,83,'Free','White',8),(253,87,'Free','Black',5),(254,87,'Free','Dark Pink',5),(255,87,'Free','Light Pink',5),(256,87,'Free','Dark Brown',5),(257,88,'Free','Dark Brown',5),(258,88,'Free','Black',5),(259,88,'Free','Pink',5),(260,88,'Free','Light Brown',5),(261,89,'Free','Pink',5),(262,89,'Free','Light Brown',6),(263,89,'Free','Dark Brown',6),(264,89,'Free','Black',4),(265,90,'Free','Pink',2),(266,90,'Free','White',2),(267,90,'Free','Red',2),(268,90,'Free','Black',1),(269,91,'Free','White',2),(270,91,'Free','Light pink',2),(271,91,'Free','Light Blue',2);
/*!40000 ALTER TABLE `product_variants` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `product_views`
--

DROP TABLE IF EXISTS `product_views`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `product_views` (
  `id` int NOT NULL AUTO_INCREMENT,
  `product_id` int DEFAULT '0',
  `ip_address` varchar(45) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `user_agent` text COLLATE utf8mb4_general_ci,
  `session_id` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `viewed_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `product_views_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=117 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `product_views`
--

LOCK TABLES `product_views` WRITE;
/*!40000 ALTER TABLE `product_views` DISABLE KEYS */;
INSERT INTO `product_views` VALUES (1,48,'::1',NULL,NULL,'2026-08-08 08:57:30'),(2,48,'::1',NULL,NULL,'2026-08-08 08:57:30'),(3,48,'::1',NULL,NULL,'2026-08-08 08:57:30'),(4,48,'::1',NULL,NULL,'2026-08-08 08:57:30'),(5,48,'::1',NULL,NULL,'2026-08-08 08:57:30'),(6,48,'::1',NULL,NULL,'2026-08-08 08:57:30'),(7,48,'::1',NULL,NULL,'2026-08-08 08:57:30'),(8,48,'::1',NULL,NULL,'2026-08-08 08:57:30'),(9,48,'::1',NULL,NULL,'2026-08-08 08:57:30'),(10,48,'::1',NULL,NULL,'2026-08-08 08:57:30'),(11,48,'::1',NULL,NULL,'2026-08-08 08:57:30'),(12,48,'::1',NULL,NULL,'2026-08-08 08:57:30'),(13,48,'::1',NULL,NULL,'2026-08-08 08:57:30'),(14,48,'::1',NULL,NULL,'2026-08-08 08:57:30'),(15,48,'::1',NULL,NULL,'2026-08-08 08:57:30'),(16,49,'::1',NULL,NULL,'2026-08-08 08:57:30'),(17,48,'::1',NULL,NULL,'2026-08-08 08:57:30'),(18,49,'::1',NULL,NULL,'2026-08-08 08:57:30'),(19,50,'::1',NULL,NULL,'2026-08-08 08:57:30'),(20,48,'::1',NULL,NULL,'2026-08-08 08:57:30'),(21,49,'::1',NULL,NULL,'2026-08-08 08:57:30'),(22,50,'::1',NULL,NULL,'2026-08-08 08:57:30'),(23,49,'::1',NULL,NULL,'2026-08-08 08:57:30'),(24,50,'::1',NULL,NULL,'2026-08-08 08:57:30'),(25,50,'::1',NULL,NULL,'2026-08-08 08:57:30'),(26,51,'::1',NULL,NULL,'2026-08-08 08:57:30'),(27,51,'::1',NULL,NULL,'2026-08-08 08:57:30'),(28,48,'::1',NULL,NULL,'2026-08-08 08:57:30'),(29,48,'::1',NULL,NULL,'2026-08-08 08:57:30'),(30,48,'::1',NULL,NULL,'2026-08-08 08:57:30'),(31,48,'::1',NULL,NULL,'2026-08-08 08:57:30'),(32,48,'::1',NULL,NULL,'2026-08-08 08:57:30'),(33,49,'::1',NULL,NULL,'2026-08-08 08:57:30'),(34,49,'::1',NULL,NULL,'2026-08-08 08:57:30'),(35,49,'::1',NULL,NULL,'2026-08-08 08:57:30'),(36,50,'::1',NULL,NULL,'2026-08-08 08:57:30'),(37,49,'::1',NULL,NULL,'2026-08-08 08:57:30'),(38,49,'::1',NULL,NULL,'2026-08-08 08:57:30'),(39,49,'::1',NULL,NULL,'2026-08-08 08:57:30'),(40,59,'::1',NULL,NULL,'2026-08-08 08:57:30'),(41,57,'::1',NULL,NULL,'2026-08-08 08:57:30'),(42,57,'::1',NULL,NULL,'2026-08-08 08:57:30'),(43,57,'::1',NULL,NULL,'2026-08-08 08:57:30'),(44,57,'::1',NULL,NULL,'2026-08-08 08:57:30'),(45,60,'::1',NULL,NULL,'2026-08-08 08:57:30'),(46,60,'::1',NULL,NULL,'2026-08-08 08:57:30'),(47,50,'::1',NULL,NULL,'2026-08-08 08:57:30'),(48,50,'::1',NULL,NULL,'2026-08-08 08:57:30'),(49,50,'::1',NULL,NULL,'2026-08-08 08:57:30'),(50,50,'::1',NULL,NULL,'2026-08-08 08:57:30'),(51,61,'::1',NULL,NULL,'2026-08-08 08:57:30'),(52,61,'::1',NULL,NULL,'2026-08-08 08:57:30'),(53,61,'::1',NULL,NULL,'2026-08-08 08:57:30'),(54,61,'::1',NULL,NULL,'2026-08-08 08:57:30'),(55,61,'::1',NULL,NULL,'2026-08-08 08:57:30'),(56,67,'::1',NULL,NULL,'2026-08-08 08:57:30'),(57,67,'::1',NULL,NULL,'2026-08-08 08:57:30'),(58,70,'::1',NULL,NULL,'2026-08-08 08:57:30'),(59,71,'::1',NULL,NULL,'2026-08-08 08:57:30'),(60,71,'::1',NULL,NULL,'2026-08-08 08:57:30'),(61,77,'::1',NULL,NULL,'2026-08-08 08:57:30'),(62,81,'::1',NULL,NULL,'2026-08-08 08:57:30'),(63,91,'::1',NULL,NULL,'2026-08-08 08:57:30'),(64,92,'::1',NULL,NULL,'2026-08-08 08:57:30'),(65,94,'::ffff:127.0.0.1',NULL,NULL,'2026-08-08 09:29:58'),(66,61,'::ffff:127.0.0.1',NULL,NULL,'2026-08-10 05:00:23'),(67,61,'::ffff:127.0.0.1',NULL,NULL,'2026-08-10 05:00:38'),(68,61,'::ffff:127.0.0.1',NULL,NULL,'2026-08-10 05:03:26'),(69,61,'::ffff:127.0.0.1',NULL,NULL,'2026-08-10 05:04:16'),(70,61,'::ffff:127.0.0.1',NULL,NULL,'2026-08-10 05:05:24'),(71,62,'::ffff:127.0.0.1',NULL,NULL,'2026-08-10 05:08:07'),(72,62,'::ffff:127.0.0.1',NULL,NULL,'2026-08-10 05:09:10'),(73,63,'::ffff:127.0.0.1',NULL,NULL,'2026-08-10 05:10:25'),(74,64,'::ffff:127.0.0.1',NULL,NULL,'2026-08-10 05:12:27'),(75,65,'::ffff:127.0.0.1',NULL,NULL,'2026-08-10 05:14:29'),(76,65,'::ffff:127.0.0.1',NULL,NULL,'2026-08-10 05:15:50'),(77,66,'::ffff:127.0.0.1',NULL,NULL,'2026-08-10 05:16:48'),(78,67,'::ffff:127.0.0.1',NULL,NULL,'2026-08-10 05:18:41'),(79,67,'::ffff:127.0.0.1',NULL,NULL,'2026-08-10 05:18:54'),(80,68,'::ffff:127.0.0.1',NULL,NULL,'2026-08-10 05:19:52'),(81,69,'::ffff:127.0.0.1',NULL,NULL,'2026-08-10 05:22:16'),(82,70,'::ffff:127.0.0.1',NULL,NULL,'2026-08-10 05:22:54'),(83,69,'::ffff:127.0.0.1',NULL,NULL,'2026-08-10 05:23:17'),(84,69,'::ffff:127.0.0.1',NULL,NULL,'2026-08-10 05:23:34'),(85,69,'::ffff:127.0.0.1',NULL,NULL,'2026-08-10 05:24:37'),(86,69,'::ffff:127.0.0.1',NULL,NULL,'2026-08-10 05:24:56'),(87,70,'::ffff:127.0.0.1',NULL,NULL,'2026-08-10 05:25:10'),(88,71,'::ffff:127.0.0.1',NULL,NULL,'2026-08-10 05:26:37'),(89,71,'::ffff:127.0.0.1',NULL,NULL,'2026-08-10 05:27:17'),(90,70,'::ffff:127.0.0.1',NULL,NULL,'2026-08-10 05:27:48'),(91,71,'::ffff:127.0.0.1',NULL,NULL,'2026-08-10 05:29:48'),(92,72,'::ffff:127.0.0.1',NULL,NULL,'2026-08-10 05:30:40'),(93,73,'::ffff:127.0.0.1',NULL,NULL,'2026-08-10 05:31:42'),(94,73,'::ffff:127.0.0.1',NULL,NULL,'2026-08-10 05:33:12'),(95,74,'::ffff:127.0.0.1',NULL,NULL,'2026-08-10 05:33:52'),(96,75,'::ffff:127.0.0.1',NULL,NULL,'2026-08-10 05:35:52'),(97,76,'::ffff:127.0.0.1',NULL,NULL,'2026-08-10 05:38:45'),(98,76,'::ffff:127.0.0.1',NULL,NULL,'2026-08-10 05:42:26'),(99,77,'::ffff:127.0.0.1',NULL,NULL,'2026-08-10 05:44:16'),(100,78,'::ffff:127.0.0.1',NULL,NULL,'2026-08-10 05:45:44'),(101,79,'::ffff:127.0.0.1',NULL,NULL,'2026-08-10 05:47:45'),(102,80,'::ffff:127.0.0.1',NULL,NULL,'2026-08-10 05:49:15'),(103,81,'::ffff:127.0.0.1',NULL,NULL,'2026-08-10 05:50:57'),(104,82,'::ffff:127.0.0.1',NULL,NULL,'2026-08-10 05:51:47'),(105,83,'::ffff:127.0.0.1',NULL,NULL,'2026-08-10 05:52:42'),(106,87,'::ffff:127.0.0.1',NULL,NULL,'2026-08-10 05:54:17'),(107,87,'::ffff:127.0.0.1',NULL,NULL,'2026-08-10 05:56:07'),(108,88,'::ffff:127.0.0.1',NULL,NULL,'2026-08-10 05:59:46'),(109,88,'::ffff:127.0.0.1',NULL,NULL,'2026-08-10 06:00:04'),(110,89,'::ffff:127.0.0.1',NULL,NULL,'2026-08-10 06:01:36'),(111,90,'::ffff:127.0.0.1',NULL,NULL,'2026-08-10 06:04:16'),(112,87,'::ffff:127.0.0.1',NULL,NULL,'2026-08-10 06:06:39'),(113,88,'::ffff:127.0.0.1',NULL,NULL,'2026-08-10 06:07:44'),(114,89,'::ffff:127.0.0.1',NULL,NULL,'2026-08-10 06:08:00'),(115,90,'::ffff:127.0.0.1',NULL,NULL,'2026-08-10 06:08:20'),(116,91,'::ffff:127.0.0.1',NULL,NULL,'2026-08-10 06:08:41');
/*!40000 ALTER TABLE `product_views` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `products`
--

DROP TABLE IF EXISTS `products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `products` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(200) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_general_ci,
  `price` decimal(10,2) DEFAULT '0.00',
  `cost_price` decimal(10,2) DEFAULT NULL,
  `category_id` int DEFAULT NULL,
  `size` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `color` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `quantity` int DEFAULT '0',
  `min_stock_alert` int DEFAULT '5',
  `status` enum('active','inactive','archived') COLLATE utf8mb4_general_ci DEFAULT 'active',
  `is_trending` tinyint(1) DEFAULT '0',
  `rating` decimal(3,2) DEFAULT '0.00',
  `total_views` int DEFAULT '0',
  `total_sold` int DEFAULT '0',
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `category_id` (`category_id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `products_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `products_ibfk_2` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=95 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `products`
--

LOCK TABLES `products` WRITE;
/*!40000 ALTER TABLE `products` DISABLE KEYS */;
INSERT INTO `products` VALUES (48,'Tendenza Elegant Wide Leg Tailored Pant','Pant\r\nWide Leg\r\nCasual Wear\r\nFabric : Cotton\r\nFabric Composition : 80% Cotton, 20% Polyester\r\nHigh rise waist and a clean, streamlined trouser, these trousers offer a polished look that\'s perfect for both work and weekend styling. The rich burgundy hue adds a refined touch, making them a versatile staple for any modern wardrobe.\r\n\r\nFeatures\r\n\r\nTailored high rise waistband.\r\nStructured waistband with belt loops and tab detailed.\r\nFront zip fly with hook and bar closure.\r\nIdeal for office wear, business casual, smart casual, and evening outings.\r\nFit & Model Details: Regular Fit, Model Height 5\' 6\" wearing size M\r\n\r\nPlease bear in mind that the photo may be slightly different from the actual item in terms of colour due to lighting conditions or the display used to view',2490.00,1880.00,NULL,NULL,NULL,74,5,'archived',1,0.00,22,48,1,'2026-08-08 08:57:31','2026-08-08 08:57:31'),(49,'Tendenza Deep V Neck Maxi Dress','Dress\r\nMaxi\r\nV Neck\r\nCasual Wear\r\nMaterial :  Cotton\r\nMaterial Composition : 100% Cotton\r\nEffortlessly elegant and easy to wear, this paisley print maxi dress is designed to take you from daytime outings to evening occasions with timeless style. V-neckline, a fitted waist with back waist elastic gathering, and a softly flowing tiered skirt.\r\n\r\nFeatures\r\n\r\nElegant all over paisley print.\r\nLong puff sleeves with elastic cuffs.\r\nSoft gathered shoulder detail.\r\nSuitable for casual outings, office wear, brunches, dinner dates, and special occasions.\r\nFit & Model Details: Regular Fit, Model Height 5\' 6\" wearing size M\r\n\r\nPlease bear in mind that the photo may be slightly different from the actual item in terms of colour due to lighting conditions or the display used to view',3195.00,2860.00,NULL,NULL,NULL,52,5,'archived',1,0.00,10,27,1,'2026-08-08 08:57:31','2026-08-08 08:57:31'),(50,'Tendenza Textured Oversized Tussle Top','Top\r\n3/4 Sleeve\r\nOversized\r\nCasual Wear\r\nMaterial : Woven\r\nMaterial Composition : 100% Polyester\r\nModel Height 5\' 6\" wearing size M \r\n\r\nDesigned with a relaxed fit, gathered yoke detailing, and voluminous three quarter sleeves, it offers the perfect balance of comfort and feminine style. The decorative tassel tie at the neckline adds a bohemian inspired touch.\r\n\r\nFeatures\r\n\r\nRound neckline with decorative tassel tie.\r\nGathered front yoke for added volume.\r\nThree quarter balloon sleeves with cuffs.\r\nPerfect for casual outings, weekend wear, vacations, and everyday styling.\r\nFit & Model Details: Relaxed Fit, Model Height 5\' 6\" wearing size M\r\n\r\nPlease bear in mind that the photo may be slightly different from the actual item in terms of colour due to lighting conditions or the display used to view',1590.00,1190.00,NULL,NULL,NULL,31,5,'archived',1,0.00,9,7,1,'2026-08-08 08:57:31','2026-08-08 08:57:31'),(51,'Tendenza Elegant Wide Leg Tailored Pant','test',2000.00,1800.00,NULL,NULL,NULL,75,5,'archived',0,0.00,2,0,1,'2026-08-08 08:57:31','2026-08-08 08:57:31'),(52,'test','ggwp',1000.00,800.00,NULL,NULL,NULL,9,5,'archived',1,0.00,0,0,1,'2026-08-08 08:57:31','2026-08-08 08:57:31'),(53,'test','',3050.00,2600.00,NULL,NULL,NULL,30,5,'archived',0,0.00,0,0,1,'2026-08-08 08:57:31','2026-08-08 08:57:31'),(54,'test','',3050.00,2600.00,NULL,NULL,NULL,30,5,'archived',0,0.00,0,0,1,'2026-08-08 08:57:31','2026-08-08 08:57:31'),(55,'test','',3050.00,2600.00,NULL,NULL,NULL,30,5,'archived',0,0.00,0,0,1,'2026-08-08 08:57:31','2026-08-08 08:57:31'),(56,'test','',3050.00,2600.00,NULL,NULL,NULL,30,5,'archived',0,0.00,0,0,1,'2026-08-08 08:57:31','2026-08-08 08:57:31'),(57,'test','',3050.00,2600.00,NULL,NULL,NULL,35,5,'archived',0,0.00,4,0,1,'2026-08-08 08:57:31','2026-08-08 08:57:31'),(58,'test','',3050.00,2600.00,NULL,NULL,NULL,30,5,'archived',0,0.00,0,0,1,'2026-08-08 08:57:31','2026-08-08 08:57:31'),(59,'test','',3050.00,2600.00,NULL,NULL,NULL,30,5,'archived',0,0.00,1,0,1,'2026-08-08 08:57:31','2026-08-08 08:57:31'),(60,'test 2','',1564.00,1225.00,NULL,NULL,NULL,16,5,'archived',1,0.00,2,0,1,'2026-08-08 08:57:31','2026-08-08 08:57:31'),(61,'Crop Top 1','',2500.00,2000.00,16,NULL,NULL,20,2,'active',1,0.00,10,3,1,'2026-08-08 08:57:31','2026-08-10 05:05:24'),(62,'Crop Top 2','',2500.00,2000.00,16,NULL,NULL,20,2,'active',0,0.00,2,0,1,'2026-08-08 08:57:31','2026-08-10 05:09:10'),(63,'Crop Top 3','',2300.00,1800.00,16,NULL,NULL,10,2,'active',0,0.00,1,0,1,'2026-08-08 08:57:31','2026-08-10 05:12:10'),(64,'Crop Top 4','',2500.00,2000.00,16,NULL,NULL,13,2,'active',0,0.00,1,0,1,'2026-08-08 08:57:31','2026-08-10 05:14:09'),(65,'Crop Top 5','',2500.00,2000.00,16,NULL,NULL,9,2,'active',0,0.00,2,1,1,'2026-08-08 08:57:31','2026-08-10 05:15:50'),(66,'Crop Top 6','',2500.00,2000.00,16,NULL,NULL,11,2,'active',0,0.00,1,0,1,'2026-08-08 08:57:31','2026-08-10 05:18:26'),(67,'Crop Top 7','',2300.00,1800.00,16,NULL,NULL,5,2,'active',0,0.00,4,0,1,'2026-08-08 08:57:31','2026-08-10 05:19:42'),(68,'Crop Top 8','',2000.00,1500.00,16,NULL,NULL,15,2,'active',0,0.00,1,0,1,'2026-08-08 08:57:31','2026-08-10 05:22:03'),(69,'Crop Top 9','',2300.00,1800.00,16,NULL,NULL,5,2,'active',0,0.00,5,0,1,'2026-08-08 08:57:31','2026-08-10 05:24:56'),(70,'Crop Top 10','',2500.00,2000.00,16,NULL,NULL,20,2,'active',0,0.00,4,0,1,'2026-08-08 08:57:31','2026-08-10 05:27:48'),(71,'Crop Top 11','',2300.00,1800.00,16,NULL,NULL,10,2,'active',0,0.00,5,0,1,'2026-08-08 08:57:31','2026-08-10 05:29:48'),(72,'Crop Top 12','',2300.00,1800.00,16,NULL,NULL,7,2,'active',0,0.00,1,0,1,'2026-08-08 08:57:31','2026-08-10 05:31:24'),(73,'Crop Top 13','',2300.00,1800.00,16,NULL,NULL,20,2,'active',0,0.00,2,0,1,'2026-08-08 08:57:31','2026-08-10 05:33:23'),(74,'Crop Top 14','',2300.00,1800.00,16,NULL,NULL,10,2,'active',0,0.00,1,0,1,'2026-08-08 08:57:31','2026-08-10 05:34:11'),(75,'Crop Top 15','',2300.00,1800.00,16,NULL,NULL,9,2,'active',0,0.00,1,0,1,'2026-08-08 08:57:31','2026-08-10 05:36:05'),(76,'Crop Top 16','',2500.00,2000.00,16,NULL,NULL,12,2,'active',0,0.00,2,0,1,'2026-08-08 08:57:31','2026-08-10 05:42:45'),(77,'Crop Top 17','',2300.00,1800.00,16,NULL,NULL,15,2,'active',0,0.00,2,0,1,'2026-08-08 08:57:31','2026-08-10 05:44:30'),(78,'Crop Top 18','',2300.00,1800.00,16,NULL,NULL,10,2,'active',0,0.00,1,0,1,'2026-08-08 08:57:31','2026-08-10 05:46:09'),(79,'Crop Top 19','',2000.00,1500.00,16,NULL,NULL,15,2,'active',0,0.00,1,0,1,'2026-08-08 08:57:31','2026-08-10 05:48:03'),(80,'Crop Top 20','',2000.00,1500.00,16,NULL,NULL,10,2,'active',0,0.00,1,0,1,'2026-08-08 08:57:31','2026-08-10 05:49:30'),(81,'Crop Top 21','',2500.00,2000.00,16,NULL,NULL,10,2,'active',0,0.00,2,0,1,'2026-08-08 08:57:31','2026-08-10 05:51:04'),(82,'Crop Top 22','',2000.00,1500.00,16,NULL,NULL,15,2,'active',0,0.00,1,0,1,'2026-08-08 08:57:31','2026-08-10 05:52:23'),(83,'Crop Top 23','',2500.00,2000.00,16,NULL,NULL,8,2,'active',0,0.00,1,0,1,'2026-08-08 08:57:31','2026-08-10 05:53:05'),(84,'Coart 1','',2500.00,1800.00,17,NULL,NULL,20,2,'active',0,0.00,0,0,1,'2026-08-08 08:57:31','2026-08-08 08:57:31'),(85,'Coart 2','',2500.00,1800.00,17,NULL,NULL,25,2,'active',0,0.00,0,0,1,'2026-08-08 08:57:31','2026-08-08 08:57:31'),(86,'Coart 3','',2500.00,1800.00,17,NULL,NULL,20,2,'active',0,0.00,0,0,1,'2026-08-08 08:57:31','2026-08-08 08:57:31'),(87,'Frock 1','',3500.00,2700.00,19,NULL,NULL,20,2,'active',0,0.00,3,0,1,'2026-08-08 08:57:31','2026-08-10 06:07:40'),(88,'Frock 2','',3500.00,2700.00,19,NULL,NULL,20,2,'active',0,0.00,3,0,1,'2026-08-08 08:57:31','2026-08-10 06:07:55'),(89,'Frock 3','',3500.00,2700.00,19,NULL,NULL,21,2,'active',0,0.00,2,0,1,'2026-08-08 08:57:31','2026-08-10 06:08:08'),(90,'Frock 4','',3500.00,2700.00,19,NULL,NULL,7,2,'active',0,0.00,2,0,1,'2026-08-08 08:57:31','2026-08-10 06:08:35'),(91,'Frock 5','',3500.00,2700.00,19,NULL,NULL,6,2,'active',0,0.00,2,0,1,'2026-08-08 08:57:31','2026-08-10 06:09:01'),(92,'Full Kit 1','',4600.00,3800.00,20,NULL,NULL,0,2,'active',0,0.00,1,0,1,'2026-08-08 08:57:31','2026-08-08 08:57:31'),(93,'Night Dress 1','',3500.00,3000.00,21,NULL,NULL,0,2,'active',0,0.00,0,0,1,'2026-08-08 08:57:31','2026-08-08 08:57:31'),(94,'Night Dress 2','',3500.00,3000.00,21,NULL,NULL,1,2,'archived',0,0.00,1,0,1,'2026-08-08 08:57:31','2026-08-10 04:58:42');
/*!40000 ALTER TABLE `products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `regions`
--

DROP TABLE IF EXISTS `regions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `regions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `province` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `delivery_charge` decimal(10,2) DEFAULT '0.00',
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `regions`
--

LOCK TABLES `regions` WRITE;
/*!40000 ALTER TABLE `regions` DISABLE KEYS */;
INSERT INTO `regions` VALUES (1,'Colombo','Central',380.00,0),(2,'Gampaha','Western',400.00,1),(3,'Colombo','Western',350.00,1),(4,'Kalutara','Western',400.00,1),(5,'Kandy','Central',450.00,1),(6,'Matale','Central',450.00,1),(7,'Nuwara Eliya','Central',500.00,1),(8,'Galle','Southern',450.00,1),(9,'Matara','Southern',450.00,1),(10,'Hambantota','Southern',500.00,1),(11,'Jaffna','Northern',500.00,1),(12,'Kilinochchi','Northern',500.00,1),(13,'Mannar','Northern',500.00,1),(14,'Vavuniya','Northern',500.00,1),(15,'Mullaitivu','Northern',500.00,1),(16,'Trincomalee','Eastern',500.00,1),(17,'Batticaloa','Eastern',500.00,1),(18,'Ampara','Eastern',550.00,1),(19,'Kurunegala','North Western',450.00,1),(20,'Puttalam','North Western',450.00,1),(21,'Anuradhapura','North Central',400.00,1),(22,'Polonnaruwa','North Central',450.00,1),(23,'Badulla','Uva',500.00,1),(24,'Monaragala','Uva',500.00,1),(25,'Ratnapura','Sabaragamuwa',450.00,1),(26,'Kegalle','Sabaragamuwa',450.00,1);
/*!40000 ALTER TABLE `regions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reports`
--

DROP TABLE IF EXISTS `reports`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reports` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `type` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `report_data` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `filters` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  `generated_by` int DEFAULT NULL,
  `generated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `generated_by` (`generated_by`),
  CONSTRAINT `reports_ibfk_1` FOREIGN KEY (`generated_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `reports_chk_1` CHECK (json_valid(`report_data`)),
  CONSTRAINT `reports_chk_2` CHECK (json_valid(`filters`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reports`
--

LOCK TABLES `reports` WRITE;
/*!40000 ALTER TABLE `reports` DISABLE KEYS */;
/*!40000 ALTER TABLE `reports` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `returns`
--

DROP TABLE IF EXISTS `returns`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `returns` (
  `id` int NOT NULL AUTO_INCREMENT,
  `order_id` int DEFAULT '0',
  `product_id` int DEFAULT '0',
  `quantity` int DEFAULT '0',
  `size` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `color` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `reason` enum('defective','wrong_size','wrong_color','damaged','other') COLLATE utf8mb4_general_ci NOT NULL,
  `description` text COLLATE utf8mb4_general_ci,
  `status` enum('pending','approved','rejected','processed') COLLATE utf8mb4_general_ci DEFAULT 'pending',
  `return_type` enum('restock','damage') COLLATE utf8mb4_general_ci DEFAULT 'restock',
  `processed_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `order_id` (`order_id`),
  KEY `product_id` (`product_id`),
  KEY `processed_by` (`processed_by`),
  CONSTRAINT `returns_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `returns_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `returns_ibfk_3` FOREIGN KEY (`processed_by`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `returns`
--

LOCK TABLES `returns` WRITE;
/*!40000 ALTER TABLE `returns` DISABLE KEYS */;
/*!40000 ALTER TABLE `returns` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `system_settings`
--

DROP TABLE IF EXISTS `system_settings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `system_settings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `setting_key` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `setting_value` text COLLATE utf8mb4_general_ci,
  `setting_group` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `description` text COLLATE utf8mb4_general_ci,
  `updated_by` int DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `setting_key` (`setting_key`),
  KEY `updated_by` (`updated_by`),
  CONSTRAINT `system_settings_ibfk_1` FOREIGN KEY (`updated_by`) REFERENCES `users` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `system_settings`
--

LOCK TABLES `system_settings` WRITE;
/*!40000 ALTER TABLE `system_settings` DISABLE KEYS */;
INSERT INTO `system_settings` VALUES (1,'bot_global_active','1',NULL,NULL,NULL,'2026-07-30 16:55:26'),(11,'whatsapp_bot_enabled','1','whatsapp','Global WhatsApp bot on/off toggle',NULL,'2026-08-06 14:26:27'),(12,'bank_details','{\"bank\":\"Commercial Bank\",\"account_name\":\"U.I. WIJESINGHE\",\"account_number\":\"8029695559\",\"branch\":\"Anuradhapura\"}','whatsapp','Bank details for payment instructions',NULL,'2026-08-08 08:57:31'),(17,'whatsapp_number','+94717716005','contact','Main WhatsApp Order Desk',NULL,'2026-08-08 08:57:31');
/*!40000 ALTER TABLE `system_settings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `email` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `password` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `role` enum('admin','cashier','customer') COLLATE utf8mb4_general_ci DEFAULT 'customer',
  `phone` varchar(15) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `profile_image` varchar(255) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `last_login` datetime DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'FelliRo Admin','irogg@felliro.com','$2a$10$sF3vtyr.uF2N4jea0Gu7fObPcy1KBZzH5TSl6XkQ2xP1WRSf8Mzza','admin',NULL,NULL,'2026-08-10 15:40:23',1,'2026-07-23 17:16:06','2026-08-10 15:40:23'),(2,'Senior Cashier','customer@gmail.com','$2a$10$sF3vtyr.uF2N4jea0Gu7fObPcy1KBZzH5TSl6XkQ2xP1WRSf8Mzza','customer',NULL,NULL,'2026-08-06 14:13:10',1,'2026-07-23 17:16:07','2026-07-23 17:16:07');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `whatsapp_chat_log`
--

DROP TABLE IF EXISTS `whatsapp_chat_log`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `whatsapp_chat_log` (
  `id` int NOT NULL AUTO_INCREMENT,
  `phone_number` varchar(30) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `direction` enum('incoming','outgoing') COLLATE utf8mb4_general_ci NOT NULL,
  `message` text COLLATE utf8mb4_general_ci,
  `media_url` varchar(500) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `media_type` varchar(50) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `sent_by` varchar(20) COLLATE utf8mb4_general_ci DEFAULT 'bot',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_phone` (`phone_number`),
  KEY `idx_created` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=90 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `whatsapp_chat_log`
--

LOCK TABLES `whatsapp_chat_log` WRITE;
/*!40000 ALTER TABLE `whatsapp_chat_log` DISABLE KEYS */;
INSERT INTO `whatsapp_chat_log` VALUES (4,'216960323305647','incoming','Hi',NULL,NULL,'customer','2026-08-08 15:23:15'),(5,'216960323305647','outgoing','ආයුබෝවන්! මම FelliRo හි Fashion Consultant ශාශා. 💕 \n\nඅද ඔබට මොනවගේ ලස්සන ඇඳුම්ද බලන්න ඕනේ? අපේ ලස්සන Crop Tops, Frocks, Co-ord Sets සහ තවත් බොහෝ දේ අප සතුව තියෙනවා. අපේ සම්පූර්ණ එකතුව සහ සියලුම නිර්මාණ https://felliro.com/products වෙබ් අඩවිය හරහාත් ඔබට පහසුවෙන්ම බලාගන්න පුළුවන්. \n\nකීවොත් මම ඔබට ගැලපෙන ලස්සනම ඩිසයින් ටිකක් පෙන්වන්නම්!',NULL,NULL,'bot','2026-08-08 15:23:17'),(6,'216960323305647','incoming','I want to order a croptop',NULL,NULL,'customer','2026-08-08 15:23:58'),(7,'216960323305647','outgoing','Wonderful choice! 💕 FelliRo එකේ අප සතුව අතිශයින්ම ලස්සන Crop Top ඩිසයින් 23ක්ම තියෙනවා (Price: Rs. 2800.00 each). \n\nඅපේ සම්පූර්ණ එකතුව සහ සියලුම ඩිසයින්ස් ඔබට https://felliro.com/products හරහා පහසුවෙන්ම බලාගන්න පුළුවන්. \n\nමම දැන් අපේ Crop Top එකතුවක פոտෝස් ටිකක් ඔයාව වෙත එවන්නම්. මේකෙන් ඔයාට කැමති ඩිසයින් එකක් තෝරගන්න පුළුවන්! ✨',NULL,NULL,'bot','2026-08-08 15:23:59'),(8,'216960323305647','outgoing','✨ *[ID:61] Crop Top 1*\n💰 *Rs. 2800.00*\n🎨 Colors: Brown, White, Black, Pink\n📏 Sizes: Free\n📦 In Stock: 20','/uploads/product-1785670406249-583190102.png','image','bot','2026-08-08 15:24:00'),(9,'216960323305647','outgoing','✨ *[ID:62] Crop Top 2*\n💰 *Rs. 2800.00*\n🎨 Colors: Pink, Brown, Navy Blue, White\n📏 Sizes: Free\n📦 In Stock: 20','/uploads/product-1785685009201-609684462.png','image','bot','2026-08-08 15:24:02'),(10,'216960323305647','outgoing','✨ *[ID:63] Crop Top 3*\n💰 *Rs. 2800.00*\n🎨 Colors: White, Pink, Black\n📏 Sizes: Free\n📦 In Stock: 10','/uploads/product-1785685163077-771110396.png','image','bot','2026-08-08 15:24:03'),(11,'216960323305647','outgoing','✨ *[ID:64] Crop Top 4*\n💰 *Rs. 2800.00*\n🎨 Colors: Blue, White, Black\n📏 Sizes: Free\n📦 In Stock: 13','/uploads/product-1785685340369-262333286.png','image','bot','2026-08-08 15:24:05'),(12,'216960323305647','outgoing','✨ *[ID:65] Crop Top 5*\n💰 *Rs. 2800.00*\n🎨 Colors: White, Black\n📏 Sizes: Free\n📦 In Stock: 10','/uploads/product-1785685465822-291413045.png','image','bot','2026-08-08 15:24:06'),(13,'216960323305647','outgoing','✨ *[ID:66] Crop Top 6*\n💰 *Rs. 2800.00*\n🎨 Colors: Pink, White, Black\n📏 Sizes: Free\n📦 In Stock: 11','/uploads/product-1785685670691-218726306.png','image','bot','2026-08-08 15:24:07'),(14,'216960323305647','outgoing','✨ *[ID:67] Crop Top 7*\n💰 *Rs. 2800.00*\n🎨 Colors: White\n📏 Sizes: Free\n📦 In Stock: 5','/uploads/product-1785685750059-736142606.png','image','bot','2026-08-08 15:24:09'),(15,'216960323305647','outgoing','✨ *[ID:68] Crop Top 8*\n💰 *Rs. 2800.00*\n🎨 Colors: Purple, Pink, Black\n📏 Sizes: Free\n📦 In Stock: 15','/uploads/product-1785685942676-945620832.png','image','bot','2026-08-08 15:24:10'),(16,'216960323305647','outgoing','✨ *[ID:69] Crop Top 9*\n💰 *Rs. 2800.00*\n🎨 Colors: White\n📏 Sizes: Free\n📦 In Stock: 5','/uploads/product-1785686075557-934732035.png','image','bot','2026-08-08 15:24:11'),(17,'216960323305647','outgoing','✨ *[ID:70] Crop Top 10*\n💰 *Rs. 2800.00*\n🎨 Colors: Pink, White, Light Brown, Dark Brown\n📏 Sizes: Free\n📦 In Stock: 20','/uploads/product-1785686273846-292700808.png','image','bot','2026-08-08 15:24:12'),(18,'216960323305647','outgoing','✨ *[ID:71] Crop Top 11*\n💰 *Rs. 2800.00*\n🎨 Colors: White, Off White, Black\n📏 Sizes: Free\n📦 In Stock: 10','/uploads/product-1785686425908-848811208.png','image','bot','2026-08-08 15:24:13'),(19,'216960323305647','outgoing','✨ *[ID:72] Crop Top 12*\n💰 *Rs. 2800.00*\n🎨 Colors: Red, Black\n📏 Sizes: Free\n📦 In Stock: 7','/uploads/product-1785686525463-184941022.png','image','bot','2026-08-08 15:24:14'),(20,'216960323305647','outgoing','✨ *[ID:73] Crop Top 13*\n💰 *Rs. 2800.00*\n🎨 Colors: Red, White\n📏 Sizes: Free\n📦 In Stock: 20','/uploads/product-1785686613107-785238295.png','image','bot','2026-08-08 15:24:15'),(21,'216960323305647','outgoing','✨ *[ID:74] Crop Top 14*\n💰 *Rs. 2800.00*\n🎨 Colors: Purple, Pink\n📏 Sizes: Free\n📦 In Stock: 10','/uploads/product-1785686716272-565033968.png','image','bot','2026-08-08 15:24:16'),(22,'216960323305647','outgoing','✨ *[ID:75] Crop Top 15*\n💰 *Rs. 2800.00*\n🎨 Colors: White, Black\n📏 Sizes: Free\n📦 In Stock: 9','/uploads/product-1785686774127-666617387.png','image','bot','2026-08-08 15:24:17'),(23,'216960323305647','outgoing','✨ *[ID:76] Crop Top 16*\n💰 *Rs. 2800.00*\n🎨 Colors: White, Brown, Black\n📏 Sizes: Free\n📦 In Stock: 12','/uploads/product-1785686857011-324615289.png','image','bot','2026-08-08 15:24:18'),(24,'216960323305647','outgoing','✨ *[ID:77] Crop Top 17*\n💰 *Rs. 2800.00*\n🎨 Colors: White, Off White, Pink\n📏 Sizes: Free\n📦 In Stock: 15','/uploads/product-1785686938376-513717827.png','image','bot','2026-08-08 15:24:19'),(25,'216960323305647','outgoing','✨ *[ID:78] Crop Top 18*\n💰 *Rs. 2800.00*\n🎨 Colors: Red, Black, White\n📏 Sizes: Free\n📦 In Stock: 10','/uploads/product-1785687012011-352048342.png','image','bot','2026-08-08 15:24:20'),(26,'216960323305647','outgoing','✨ *[ID:79] Crop Top 19*\n💰 *Rs. 2800.00*\n🎨 Colors: Off White, Black, Brown\n📏 Sizes: Free\n📦 In Stock: 15','/uploads/product-1785687152815-171194189.png','image','bot','2026-08-08 15:24:21'),(27,'216960323305647','outgoing','✨ *[ID:80] Crop Top 20*\n💰 *Rs. 2800.00*\n🎨 Colors: Red, Off White\n📏 Sizes: Free\n📦 In Stock: 10','/uploads/product-1785687216735-16200836.png','image','bot','2026-08-08 15:24:22'),(28,'216960323305647','outgoing','✨ *[ID:81] Crop Top 21*\n💰 *Rs. 2800.00*\n🎨 Colors: White, Black\n📏 Sizes: Free\n📦 In Stock: 10','/uploads/product-1785687275742-164118412.png','image','bot','2026-08-08 15:24:23'),(29,'216960323305647','incoming','can i order now?',NULL,NULL,'customer','2026-08-08 15:24:24'),(30,'216960323305647','outgoing','✨ *[ID:82] Crop Top 22*\n💰 *Rs. 2800.00*\n🎨 Colors: Pink, Purple, Green\n📏 Sizes: Free\n📦 In Stock: 15','/uploads/product-1785687367953-255086474.png','image','bot','2026-08-08 15:24:25'),(31,'216960323305647','outgoing','Of course! You can place your order right now. 💕 \n\nඅප සතුව ලස්සන Crop Top ඩිසයින් 23ක්ම තියෙනවා (Rs. 2800.00 බැගින්). අපේ සම්පූර්ණ එකතුව https://felliro.com/products වෙබ් අඩවිය හරහාත් ඔබට බලාගන්න පුළුවන්.\n\nඔබට Order කරන්න අවශ්‍ය Crop Top එකේ ඩිසයින් එකක් (නැත්නම් අංකයක්), ඒ වගේම ඔබට අවශ්‍ය පාට (Color), සයිස් එක (Free Size) සහ ප්‍රමාණය (Quantity) මට මෙතනින් කියන්න. මම ඉක්මනින්ම ඔබේ Cart එකට එකතු කරලා ඊළඟ පියවරට යන්න උදව් කරන්නම්! ✨',NULL,NULL,'bot','2026-08-08 15:24:25'),(32,'216960323305647','outgoing','✨ *[ID:83] Crop Top 23*\n💰 *Rs. 2800.00*\n🎨 Colors: White\n📏 Sizes: Free\n📦 In Stock: 8','/uploads/product-1785687405746-980068990.png','image','bot','2026-08-08 15:24:26'),(33,'216960323305647','outgoing','✨ *[ID:61] Crop Top 1*\n💰 *Rs. 2800.00*\n🎨 Colors: Brown, White, Black, Pink\n📏 Sizes: Free\n📦 In Stock: 20','/uploads/product-1785670406249-583190102.png','image','bot','2026-08-08 15:24:26'),(34,'216960323305647','outgoing','✨ *Crop Top* හි සියලුම Designs, Colors, Sizes සහ සම්පූර්ණ Stock විස්තර අපගේ Website එකෙන් සෘජුවම බලාගත හැක:\n🔗 https://felliro.com/products\n\nඔබ මෙහි ඇති ඇඳුමකට කැමති නම්, එහි *නම* හෝ *ID අංකය* සමඟ අවශ්‍ය *Color*, *Size*, *Quantity* එවන්න. මම Order එක සකස් කර දෙන්නම්! 💕',NULL,NULL,'bot','2026-08-08 15:24:26'),(35,'216960323305647','outgoing','✨ *[ID:62] Crop Top 2*\n💰 *Rs. 2800.00*\n🎨 Colors: Pink, Brown, Navy Blue, White\n📏 Sizes: Free\n📦 In Stock: 20','/uploads/product-1785685009201-609684462.png','image','bot','2026-08-08 15:24:27'),(36,'216960323305647','outgoing','✨ *[ID:63] Crop Top 3*\n💰 *Rs. 2800.00*\n🎨 Colors: White, Pink, Black\n📏 Sizes: Free\n📦 In Stock: 10','/uploads/product-1785685163077-771110396.png','image','bot','2026-08-08 15:24:28'),(37,'216960323305647','outgoing','✨ *[ID:64] Crop Top 4*\n💰 *Rs. 2800.00*\n🎨 Colors: Blue, White, Black\n📏 Sizes: Free\n📦 In Stock: 13','/uploads/product-1785685340369-262333286.png','image','bot','2026-08-08 15:24:29'),(38,'216960323305647','outgoing','✨ *[ID:65] Crop Top 5*\n💰 *Rs. 2800.00*\n🎨 Colors: White, Black\n📏 Sizes: Free\n📦 In Stock: 10','/uploads/product-1785685465822-291413045.png','image','bot','2026-08-08 15:24:30'),(39,'216960323305647','outgoing','✨ *[ID:66] Crop Top 6*\n💰 *Rs. 2800.00*\n🎨 Colors: Pink, White, Black\n📏 Sizes: Free\n📦 In Stock: 11','/uploads/product-1785685670691-218726306.png','image','bot','2026-08-08 15:24:32'),(40,'216960323305647','outgoing','✨ *[ID:67] Crop Top 7*\n💰 *Rs. 2800.00*\n🎨 Colors: White\n📏 Sizes: Free\n📦 In Stock: 5','/uploads/product-1785685750059-736142606.png','image','bot','2026-08-08 15:24:33'),(41,'216960323305647','outgoing','✨ *[ID:68] Crop Top 8*\n💰 *Rs. 2800.00*\n🎨 Colors: Purple, Pink, Black\n📏 Sizes: Free\n📦 In Stock: 15','/uploads/product-1785685942676-945620832.png','image','bot','2026-08-08 15:24:34'),(42,'216960323305647','outgoing','✨ *[ID:69] Crop Top 9*\n💰 *Rs. 2800.00*\n🎨 Colors: White\n📏 Sizes: Free\n📦 In Stock: 5','/uploads/product-1785686075557-934732035.png','image','bot','2026-08-08 15:24:35'),(43,'216960323305647','outgoing','✨ *[ID:70] Crop Top 10*\n💰 *Rs. 2800.00*\n🎨 Colors: Pink, White, Light Brown, Dark Brown\n📏 Sizes: Free\n📦 In Stock: 20','/uploads/product-1785686273846-292700808.png','image','bot','2026-08-08 15:24:37'),(44,'216960323305647','outgoing','✨ *[ID:71] Crop Top 11*\n💰 *Rs. 2800.00*\n🎨 Colors: White, Off White, Black\n📏 Sizes: Free\n📦 In Stock: 10','/uploads/product-1785686425908-848811208.png','image','bot','2026-08-08 15:24:38'),(45,'216960323305647','outgoing','✨ *[ID:72] Crop Top 12*\n💰 *Rs. 2800.00*\n🎨 Colors: Red, Black\n📏 Sizes: Free\n📦 In Stock: 7','/uploads/product-1785686525463-184941022.png','image','bot','2026-08-08 15:24:39'),(46,'216960323305647','outgoing','✨ *[ID:73] Crop Top 13*\n💰 *Rs. 2800.00*\n🎨 Colors: Red, White\n📏 Sizes: Free\n📦 In Stock: 20','/uploads/product-1785686613107-785238295.png','image','bot','2026-08-08 15:24:40'),(47,'216960323305647','outgoing','✨ *[ID:74] Crop Top 14*\n💰 *Rs. 2800.00*\n🎨 Colors: Purple, Pink\n📏 Sizes: Free\n📦 In Stock: 10','/uploads/product-1785686716272-565033968.png','image','bot','2026-08-08 15:24:41'),(48,'216960323305647','outgoing','✨ *[ID:75] Crop Top 15*\n💰 *Rs. 2800.00*\n🎨 Colors: White, Black\n📏 Sizes: Free\n📦 In Stock: 9','/uploads/product-1785686774127-666617387.png','image','bot','2026-08-08 15:24:41'),(49,'216960323305647','outgoing','✨ *[ID:76] Crop Top 16*\n💰 *Rs. 2800.00*\n🎨 Colors: White, Brown, Black\n📏 Sizes: Free\n📦 In Stock: 12','/uploads/product-1785686857011-324615289.png','image','bot','2026-08-08 15:24:42'),(50,'216960323305647','outgoing','✨ *[ID:77] Crop Top 17*\n💰 *Rs. 2800.00*\n🎨 Colors: White, Off White, Pink\n📏 Sizes: Free\n📦 In Stock: 15','/uploads/product-1785686938376-513717827.png','image','bot','2026-08-08 15:24:43'),(51,'216960323305647','outgoing','✨ *[ID:78] Crop Top 18*\n💰 *Rs. 2800.00*\n🎨 Colors: Red, Black, White\n📏 Sizes: Free\n📦 In Stock: 10','/uploads/product-1785687012011-352048342.png','image','bot','2026-08-08 15:24:44'),(52,'216960323305647','outgoing','✨ *[ID:79] Crop Top 19*\n💰 *Rs. 2800.00*\n🎨 Colors: Off White, Black, Brown\n📏 Sizes: Free\n📦 In Stock: 15','/uploads/product-1785687152815-171194189.png','image','bot','2026-08-08 15:24:45'),(53,'216960323305647','outgoing','✨ *[ID:80] Crop Top 20*\n💰 *Rs. 2800.00*\n🎨 Colors: Red, Off White\n📏 Sizes: Free\n📦 In Stock: 10','/uploads/product-1785687216735-16200836.png','image','bot','2026-08-08 15:24:46'),(54,'216960323305647','outgoing','✨ *[ID:81] Crop Top 21*\n💰 *Rs. 2800.00*\n🎨 Colors: White, Black\n📏 Sizes: Free\n📦 In Stock: 10','/uploads/product-1785687275742-164118412.png','image','bot','2026-08-08 15:24:47'),(55,'216960323305647','outgoing','✨ *[ID:82] Crop Top 22*\n💰 *Rs. 2800.00*\n🎨 Colors: Pink, Purple, Green\n📏 Sizes: Free\n📦 In Stock: 15','/uploads/product-1785687367953-255086474.png','image','bot','2026-08-08 15:24:48'),(56,'216960323305647','outgoing','✨ *[ID:83] Crop Top 23*\n💰 *Rs. 2800.00*\n🎨 Colors: White\n📏 Sizes: Free\n📦 In Stock: 8','/uploads/product-1785687405746-980068990.png','image','bot','2026-08-08 15:24:49'),(57,'216960323305647','outgoing','✨ *Crop Top* හි සියලුම Designs, Colors, Sizes සහ සම්පූර්ණ Stock විස්තර අපගේ Website එකෙන් සෘජුවම බලාගත හැක:\n🔗 https://felliro.com/products\n\nඔබ මෙහි ඇති ඇඳුමකට කැමති නම්, එහි *නම* හෝ *ID අංකය* සමඟ අවශ්‍ය *Color*, *Size*, *Quantity* එවන්න. මම Order එක සකස් කර දෙන්නම්! 💕',NULL,NULL,'bot','2026-08-08 15:24:49'),(58,'216960323305647','incoming','I want id 83 design.how i order it',NULL,NULL,'customer','2026-08-08 15:25:30'),(59,'216960323305647','outgoing','Great choice! The Crop Top 23 (ID: 83) is a gorgeous design! 💕 \n\nIt is available in **White** color with a **Free Size** (Price: Rs. 2800.00). \n\nHow many would you like to order? Just let me know the quantity (and confirm the color and size), and I\'ll add it to your cart right away! ✨',NULL,NULL,'bot','2026-08-08 15:25:31'),(60,'216960323305647','outgoing','✨ *[ID:83] Crop Top 23*\n💰 *Rs. 2800.00*\n🎨 Colors: White\n📏 Sizes: Free','/uploads/product-1785687405746-980068990.png','image','bot','2026-08-08 15:25:31'),(61,'216960323305647','incoming','i want only one',NULL,NULL,'customer','2026-08-08 15:25:55'),(62,'216960323305647','outgoing','Aniwa, අනිවාර්යයෙන්ම! 🌸 Crop Top 23 (ID: 83) එකෙන් 1ක් මම ඔයාගේ Cart එකට එකතු කරනවා. \n\n\n\nඔන්න මම ඒක සාර්ථකව ඔයාගේ Cart එකට එකතු කළා! 💕 \n* **Cart Total:** Rs. 2800.00\n\nතවත් වෙනස් ඩිසයින් එකක් බලන්න කැමතිද, නැත්නම් බිල් කරලා Order එක Confirm කරමුද? මට කියන්න පුළුවන්! ✨',NULL,NULL,'bot','2026-08-08 15:25:56'),(63,'216960323305647','incoming','I want a bill it',NULL,NULL,'customer','2026-08-08 15:26:45'),(64,'216960323305647','outgoing','නිසැකවම! 🌸 අපි දැන් ඔයාගේ Order එකට Bill එක හදමු. \n\nභාණ්ඩය ලබා දීම සඳහා (Delivery) පහත විස්තර ටික මට ලබා දෙන්න පුළුවන්ද? 💕\n\n1. **ඔබේ නම (Full Name):**\n2. **දුරකථන අංකය (Phone Number):**\n3. **ලිපිනය (Delivery Address):**\n4. **නගරය (City):**\n\nමේ විස්තර ටික ලැබුණු වුණ马上ම මම ඔයාගේ Bill එක සහ ගෙවීම් කරන්න ඕන විදිහ (Commercial Bank details) එවන්නම්! ✨',NULL,NULL,'bot','2026-08-08 15:26:46'),(65,'216960323305647','incoming','Hi',NULL,NULL,'customer','2026-08-09 01:28:56'),(66,'216960323305647','outgoing','ආයුබෝවන්! 💕 FelliRo වෙත සාදරයෙන් පිළිගනිමු! මම ඔයාගේ Fashion Consultant ශාශා. \n\nඔබට අද FelliRo එකෙන් මොනවගේ ලස්සන ඇඳුම්ද බලන්න ඕනේ? අපේ ලස්සන Crop Tops, Co-arts, Frocks සහ වෙනත් අලුත්ම ඩිසයින් අපේ https://felliro.com/products වෙබ් අඩවිය හරහාත් බලාගන්න පුළුවන්! \n\nඅද මම ඔයාට උදව් කරන්නේ කොහොමද? ✨',NULL,NULL,'bot','2026-08-09 01:28:57'),(67,'78971597271125','incoming','45751 is your Facebook confirmation code',NULL,NULL,'customer','2026-08-09 11:04:04'),(68,'78971597271125','outgoing','ආයුබෝවන්! \n\nමම FelliRo හි Fashion Consultant ශාශා. ඔබගේ Facebook confirmation code එකක් මට ලැබුණා, නමුත් මම ඔබේ ඇඳුම් තෝරාගැනීම් සහ ඇණවුම් කටයුතු වලට උදව් කිරීමට සිටින AI සහකාරවරියක් වන නිසා, මට ඒකෙන් විශේෂ ප්‍රයෝජනයක් නැහැ! 😊\n\nඔබට අපේ ලස්සන Frocks, Crop Tops, හෝ වෙනත් ඕනෑම ඇඳුම් එකතුවකින් නවතම නිර්මාණ බලන්න ඕනේද? අපේ සම්පූර්ණ එකතුව https://felliro.com/products වෙබ් අඩවියෙනුත් බලාගන්න පුළුවන්. \n\nඅද ඔබට මොනවගේ ඇඳුම්ද බලන්න ඕනේ? 💕',NULL,NULL,'bot','2026-08-09 11:04:06'),(69,'244152382009515','incoming','',NULL,NULL,'customer','2026-08-09 11:19:36'),(70,'78971597271125','incoming','',NULL,NULL,'customer','2026-08-09 11:54:09'),(71,'218991960281275','incoming','Hi',NULL,NULL,'customer','2026-08-09 12:56:14'),(72,'218991960281275','outgoing','හායි! ආයුබෝවන්! මම FelliRo හි Fashion Consultant ශාශා. 💕 \n\nඅද ඔබට මොනවගේ ලස්සන ඇඳුම්ද බලන්න ඕනේ? අපේ ලස්සන Crop Tops, Frocks, Coarts සහ වෙනත් අලුත්ම ඩිසයින් ගොඩක් තියෙනවා. අපේ සම්පූර්ණ එකතුව සහ සියලුම ඩිසයින් විස්තර https://felliro.com/products වෙබ් අඩවිය හරහාත් ඔබට බලාගන්න පුළුවන්. \n\nකෝ, කියන්න බලන්න ඔබට ගැළපෙනම ස්ට්රයිල් එක මොකක්ද කියලා?',NULL,NULL,'bot','2026-08-09 12:56:17'),(73,'163011675299843','incoming','Yes',NULL,NULL,'customer','2026-08-09 13:00:38'),(74,'218991960281275','incoming','Hi',NULL,NULL,'customer','2026-08-09 13:00:57'),(75,'218991960281275','incoming','Croptop Ella Hanna pulled',NULL,NULL,'customer','2026-08-09 13:02:05'),(76,'163011675299843','incoming','Me video eke thiyen crop',NULL,NULL,'customer','2026-08-09 13:02:05'),(77,'163011675299843','incoming','top',NULL,NULL,'customer','2026-08-09 13:02:06'),(78,'218991960281275','outgoing','Hello! FelliRo හි Fashion Consultant ශාශා මෙන්න. 💕 \n\nඔබ \"Crop Top\" එකක් ගැනද ඇහුවේ? අපේ ලස්සන Crop Top ඩිසයින් 23ක්ම දැන් stock එකේ තියෙනවා! Price එක Rs. 2800.00 යි. \n\nඅපේ සම්පූර්ණ Crop Top එකතුව සහ හැම ඩිසයින් එකකම විස්තර ඔබට අපේ වෙබ් අඩවියෙන් බලන්න පුළුවන්: https://felliro.com/products \n\nඔබට විශේෂිත ඩිසයින් එකක් (Crop Top 1 සිට Crop Top 23 දක්වා) බලන්න ඕනෑ නම් මට කියන්න. මම ඒවල photos එවන්නම්!',NULL,NULL,'bot','2026-08-09 13:02:06'),(79,'163011675299843','incoming','el',NULL,NULL,'customer','2026-08-09 13:02:08'),(80,'218991960281275','outgoing','✨ *[ID:61] Crop Top 1*\n💰 *Rs. 2800.00*\n🎨 Colors: Brown, White, Black, Pink\n📏 Sizes: Free\n📦 In Stock: 20','/uploads/product-1785670406249-583190102.png','image','bot','2026-08-09 13:02:08'),(81,'218991960281275','outgoing','✨ *[ID:62] Crop Top 2*\n💰 *Rs. 2800.00*\n🎨 Colors: Pink, Brown, Navy Blue, White\n📏 Sizes: Free\n📦 In Stock: 20','/uploads/product-1785685009201-609684462.png','image','bot','2026-08-09 13:02:09'),(82,'163011675299843','incoming','ek',NULL,NULL,'customer','2026-08-09 13:02:09'),(83,'218991960281275','outgoing','✨ *[ID:63] Crop Top 3*\n💰 *Rs. 2800.00*\n🎨 Colors: White, Pink, Black\n📏 Sizes: Free\n📦 In Stock: 10','/uploads/product-1785685163077-771110396.png','image','bot','2026-08-09 13:02:11'),(84,'163011675299843','outgoing','අපේ lassanama lassanama Crop Top collection එකේ designs 23ක්ම දැන් our boutique එකේ available තینවා! \n\nඔබට මේ Crop Top සියල්ලම සහ ඒවායේ විස්තර අපේ නිල වෙබ් අඩවියෙන් පහසුවෙන් බලාගන්න පුළුවන්: https://felliro.com/products 🌸\n\nමෙන්න අපේ Crop Top collection එකේ photos ටික:',NULL,NULL,'bot','2026-08-09 13:02:11'),(85,'218991960281275','outgoing','✨ *[ID:64] Crop Top 4*\n💰 *Rs. 2800.00*\n🎨 Colors: Blue, White, Black\n📏 Sizes: Free\n📦 In Stock: 13','/uploads/product-1785685340369-262333286.png','image','bot','2026-08-09 13:02:11'),(86,'163011675299843','outgoing','✨ *[ID:61] Crop Top 1*\n💰 *Rs. 2800.00*\n🎨 Colors: Brown, White, Black, Pink\n📏 Sizes: Free\n📦 In Stock: 20','/uploads/product-1785670406249-583190102.png','image','bot','2026-08-09 13:02:11'),(87,'218991960281275','outgoing','✨ *[ID:65] Crop Top 5*\n💰 *Rs. 2800.00*\n🎨 Colors: White, Black\n📏 Sizes: Free\n📦 In Stock: 10','/uploads/product-1785685465822-291413045.png','image','bot','2026-08-09 13:02:12'),(88,'163011675299843','outgoing','✨ *[ID:62] Crop Top 2*\n💰 *Rs. 2800.00*\n🎨 Colors: Pink, Brown, Navy Blue, White\n📏 Sizes: Free\n📦 In Stock: 20','/uploads/product-1785685009201-609684462.png','image','bot','2026-08-09 13:02:13'),(89,'218991960281275','outgoing','✨ *[ID:66] Crop Top 6*\n💰 *Rs. 2800.00*\n🎨 Colors: Pink, White, Black\n📏 Sizes: Free\n📦 In Stock: 11','/uploads/product-1785685670691-218726306.png','image','bot','2026-08-09 13:02:13');
/*!40000 ALTER TABLE `whatsapp_chat_log` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `whatsapp_conversations`
--

DROP TABLE IF EXISTS `whatsapp_conversations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `whatsapp_conversations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `phone_number` varchar(30) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `customer_name` varchar(100) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `order_id` int DEFAULT NULL,
  `state` varchar(50) COLLATE utf8mb4_general_ci DEFAULT 'idle',
  `cart_data` text COLLATE utf8mb4_general_ci,
  `customer_data` text COLLATE utf8mb4_general_ci,
  `assigned_to_human` tinyint(1) DEFAULT '0',
  `last_message_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `phone_number` (`phone_number`)
) ENGINE=InnoDB AUTO_INCREMENT=90 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `whatsapp_conversations`
--

LOCK TABLES `whatsapp_conversations` WRITE;
/*!40000 ALTER TABLE `whatsapp_conversations` DISABLE KEYS */;
INSERT INTO `whatsapp_conversations` VALUES (4,'216960323305647',NULL,NULL,'idle',NULL,NULL,0,'2026-08-09 01:28:57','2026-08-08 15:23:15'),(67,'78971597271125',NULL,NULL,'idle',NULL,NULL,0,'2026-08-09 11:54:09','2026-08-09 11:04:04'),(69,'244152382009515',NULL,NULL,'idle',NULL,NULL,0,'2026-08-09 11:19:36','2026-08-09 11:19:36'),(71,'218991960281275',NULL,NULL,'idle',NULL,NULL,0,'2026-08-09 17:01:42','2026-08-09 12:56:14'),(73,'163011675299843',NULL,NULL,'idle',NULL,NULL,0,'2026-08-09 13:02:13','2026-08-09 13:00:38');
/*!40000 ALTER TABLE `whatsapp_conversations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `whatsapp_logs`
--

DROP TABLE IF EXISTS `whatsapp_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `whatsapp_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `product_id` int DEFAULT NULL,
  `phone_number` varchar(15) COLLATE utf8mb4_general_ci DEFAULT NULL,
  `message` text COLLATE utf8mb4_general_ci,
  `status` enum('sent','failed') COLLATE utf8mb4_general_ci DEFAULT 'sent',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `whatsapp_logs_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `whatsapp_logs`
--

LOCK TABLES `whatsapp_logs` WRITE;
/*!40000 ALTER TABLE `whatsapp_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `whatsapp_logs` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-08-12 14:56:22
