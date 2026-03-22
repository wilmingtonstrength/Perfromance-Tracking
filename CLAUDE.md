# Wilmington Strength Performance Tracking App

## Overview
Single-file React app (App.js) that tracks youth athlete and adult client performance testing. Connects to Supabase for data. Deploys to wilmington-strength-app.netlify.app via GitHub.

## Tech Stack
- React (single App.js file, not JSX)
- Supabase backend (project: xxtomnbvinxuvnrrqnqb)
- Tables: athletes, results, tests
- Netlify deployment

## Critical Rules
- ALWAYS output complete .js files, never partial snippets
- File extension is .js NOT .jsx
- Never break existing functionality when adding features
- All styles are inline (no CSS files)
- Font: Archivo / Archivo Black from Google Fonts
- Color scheme: #0a1628 background, #00d4ff accent, #00ff88 success/PR, #FFA500 adult

## Database Schema
- **athletes**: id, first_name, last_name, birthday, age, gender, status, type (athlete|adult), standing_reach, email, phone
- **results**: id, athlete_id, test_id, test_date, raw_value, converted_value, unit, is_pr
- **tests**: id, name, unit, direction, category, category_label, display_unit, allow_kg, feet_inches, row_time, athlete_type, show_on_record_board, record_board_section, record_board_format, convert_formula, sort_order, active

## Current Pages
- Test Entry (batch entry with youth/adult toggle)
- Athletes (profiles with PRs, history, progress charts, Athlete Score)
- Rankings (TSA z-score leaderboard - BEING REPLACED with Athlete Profile Radar)
- Recent PRs
- Jump Calculator (approach jump with standing reach)
- Record Board (boys/girls/adults, TV Mode with Wake Lock)
- Test Settings (add/edit/remove tests)

## Key Patterns
- TSA Athlete Score: z-score 0-100 across youth Supabase population using normalCDF
- Record Board: top 5 per test, 15+ and 14-under age splits, rollup tests for squat/overhead
- TV Mode: Wake Lock API + synthetic mousemove keepalive every 10min
- Tests are database-driven from the tests table
- Results pagination: fetches in batches of 500
