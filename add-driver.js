#!/usr/bin/env node

/**
 * Script to add a driver to the Koloi system
 * Usage: node add-driver.js <email> [vehicleType] [plateNumber] [vehicleMake] [vehicleModel] [vehicleYear]
 * 
 * Example:
 * node add-driver.js moyojonahb@gmail.com economy ABC123 Toyota Corolla 2022
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

// Load environment variables from .env.local
const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");
  envContent.split("\n").forEach((line) => {
    const [key, value] = line.split("=");
    if (key && value) {
      process.env[key.trim()] = value.trim();
    }
  });
}

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("❌ Error: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment");
  console.error("Please set these in your .env.local file");
  process.exit(1);
}

const args = process.argv.slice(2);
const email = args[0];

if (!email) {
  console.error("❌ Error: Email is required");
  console.error("Usage: node add-driver.js <email> [vehicleType] [plateNumber] [vehicleMake] [vehicleModel] [vehicleYear]");
  process.exit(1);
}

const vehicleType = args[1] || "economy";
const plateNumber = args[2] || "";
const vehicleMake = args[3] || "";
const vehicleModel = args[4] || "";
const vehicleYear = args[5] ? parseInt(args[5]) : null;

async function addDriver() {
  try {
    console.log(`🚀 Adding driver for email: ${email}`);

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Find user by email
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
      console.error("❌ Error listing users:", usersError.message);
      process.exit(1);
    }

    const targetUser = users.users.find((u) => u.email === email);

    if (!targetUser) {
      console.error(`❌ Error: User with email ${email} not found`);
      process.exit(1);
    }

    console.log(`✅ Found user: ${targetUser.id}`);

    // Check if driver record already exists
    const { data: existingDriver } = await supabase
      .from("drivers")
      .select("id")
      .eq("user_id", targetUser.id)
      .maybeSingle();

    if (existingDriver) {
      console.error("❌ Error: Driver record already exists for this user");
      process.exit(1);
    }

    // Create driver record
    const { data: newDriver, error: driverError } = await supabase
      .from("drivers")
      .insert({
        user_id: targetUser.id,
        status: "approved",
        vehicle_type: vehicleType,
        plate_number: plateNumber,
        vehicle_make: vehicleMake,
        vehicle_model: vehicleModel,
        vehicle_year: vehicleYear,
        rating_avg: 0,
        total_trips: 0,
        is_online: false,
      })
      .select()
      .single();

    if (driverError) {
      console.error("❌ Error creating driver:", driverError.message);
      process.exit(1);
    }

    console.log("✅ Driver created successfully!");
    console.log("\n📋 Driver Details:");
    console.log(`   ID: ${newDriver.id}`);
    console.log(`   User ID: ${newDriver.user_id}`);
    console.log(`   Email: ${email}`);
    console.log(`   Status: ${newDriver.status}`);
    console.log(`   Vehicle Type: ${newDriver.vehicle_type}`);
    if (plateNumber) console.log(`   Plate Number: ${plateNumber}`);
    if (vehicleMake) console.log(`   Vehicle: ${vehicleMake} ${vehicleModel} ${vehicleYear || ""}`);
    console.log(`   Created: ${newDriver.created_at}`);
  } catch (error) {
    console.error("❌ Unexpected error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

addDriver();
