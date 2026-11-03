# Access+ to-do list

Living list of planned work for the pilot website. Newest ideas at the top of each section.

## Next simulator project

- **3D JACO-style robotic arm simulator** (added October 31, 2026)
  - True 3D scene: objects at different distances, shown smaller and farther with shadows, so the user has to judge reach
  - Real assistive-arm controls: reach in and out, raise and lower, turn the wrist, open and close the gripper, switching modes the way a JACO user does
  - Works with nose tracking, eye gaze, switches, mini joystick and arrow keys
  - Levels: a big cup close by, then smaller, farther and awkwardly placed objects (pill bottle on a shelf, phone at the table edge, door handle)
  - Results feed the AI profile: accuracy, time, number of corrections, fatigue over a session, as evidence for evaluations and funding reviews
  - Safety habits built in: confirm before safety-relevant actions, a stop and reverse control
  - Lives on the Simulators page; the home-page dial stays a simple guide

## Research program

- Ability tracking and technology transition plan (Nov 1, 2026), Claude Doc: https://claude.ai/artifact/8jweRCMyuJEgCW126q6dmj
  - Background measures inside existing tech: dwell time, success rate, striking distance, time to target, path smoothness, spasticity and tremor signs, fatigue, switch timing, breath, voice
  - Two-week settings protocol with short real tasks; setting recommendations, never automatic
  - Technology chain (head, breath, eye gaze, EMG, BCI, combinations) and transferable skills
  - Daily living targets (drink, eat, food transfers, brush teeth and hair, messages, call for help, home control, driving)
  - Communication preparedness: speech early warning, voice banking, practiced fallback
  - Consent, de-identified research sharing, IRB

- Research dashboard built (Nov 1, 2026): #research view on a simulated cohort (60 participants, 52 weeks) with filters, group trend, snapshot compare, early warning before a switch, technology chain, participant drill-down with pointing traces, data files browser with CSV downloads, method and sources. Next: feed real session data from the simulators; add a participant "My data" view

- Focus shift (Nov 2, 2026): home entry is now Everyday control (input methods); daily-living cards replaced by input-method cards; robotic arm moved to the Simulators page as a cutting-edge simulator holding the daily-living tasks; BCI marked potential, for discussion; dashboard tasks switched to everyday control

- Home feature (Nov 2, 2026): simulated side-by-side comparison of head and gesture tracking, eye tracking and switch scanning, with ability, fatigue, tremor and position controls, animated task, score meters, best fit and crossover, continuum chart, and your-setup add-ons (switch click, facial-gesture click, tremor smoothing, larger targets, word prediction, voice)

## Website

- Shelved (Nov 1, 2026): independent reviews, community reviewers and company listings, removed from the site for now; neutral technology guides stay
- Lending (Nov 1, 2026): draft policy (no wheelchairs; mouth-contact parts are kept, never re-lent; cleaning protocol; seating provider installs anything that drives a chair); Omni2 proposed as a loan item with full catalog card (compatibility, components, install steps, safety). Next: confirm R-net models list with dealers, loan logistics
- Ability checks (Nov 1, 2026): gesture check reframed as one of several checks the AI agent chooses (eye movement, breath, EMG, switch timing, face and head gestures, BCI referral); studio suggests checks from answers. Next: build eye movement, breath, EMG and switch timing checks
- Catalog entries added (Nov 1, 2026): QuadStick (new Game controllers area), Magic Flute (My Breath My Music), video links for Orlosky eye tracker and OptiKey
- Catalog listing format (Nov 1, 2026): standard card (what it is, at a glance, watch and read, evidence, insights, community comments placeholder); first entry EyeHarp under Gaming and music. Next: convert other guides to catalog cards; real comments need sign-in, moderation, consent
- Eye tracking guide (Nov 1, 2026): screen-mounted vs head-worn, with the low-cost open-source eye-tracking glasses from Dr. Jason Orlosky (Augusta University)
- Solutions organized (Nov 1, 2026): three kinds, software (commercial, open source, built in), hardware (proprietary, open source), bridges and interfaces (into the chair, out of the chair, into devices); new Bridges tab with a wheelchair bridges guide. Next: switch interfaces, gaming bridges, home and infrared bridges
- Simulator banner (Nov 1, 2026): home sneak peek of a wheelchair course with a steep hill, narrow bridge over water, side slope, slope and tilt meters and hazard warnings. Ideas next: curb cuts and doorways, van ramp, night drive with headlights, moving obstacles, recreational courses (sailing, go-kart)
- Home simplified (Nov 1, 2026): AI agent merged into Step 1 "Start with a goal" (say or type a goal); the goal opens the profile studio with it filled in; full agent chat lives on the profile pages
- Profile studio (Nov 1, 2026): Find my technology rebuilt as a split screen, AI agent on the left, live profile center on the right (goals, movements, method match bars, starting settings, practice tracks, agent activity log), saves a profile file
- Robotic arm: 3D tabletop arm and reach-and-grasp skill test with score and Save my results built (Nov 1, 2026). Next: input selector (switch scanning, head tilt, face switches), AI assist slider, top-down camera view
- Profile: skills, settings and trends prototype with activity profiles, focus skills, save/open file (Nov 1, 2026). Next: Save/Open on gesture check; feed real skill test results into trends
- Fill in the "coming next" areas: switches and interfaces, smart home and safety, communication devices, lifts and transfers, environmental supports and mounting, computer access, phones and tablets, communication software, gaming and music, smart wheelchairs, exoskeletons and stimulation, smart glasses and AR
- Profile carries through the journey: goals into the profile, "Matches for you" on Solutions, kit request pre-filled
- Real sign-up, community reviews and kit requests: storage, privacy policy, consent
- Clinician mode: manage clients, order kits, see results over time
- Soundboard and talking board simulator details (waiting on Dave)
- FaceNav link for the head and face tracking guide (waiting on Dave)
- Confirm partner wording with each organization before sharing widely
- Dated facts with an owner who checks them (prices, trial counts, coverage rules)
- Written conflict-of-interest policy once the coalition is formal

- Owned equipment and frequency of use: profile tools table shows how often each item is used and flags rarely used items gently; research dashboard card plus owned_equipment.csv (simulated). Escalation wording softened: changing technology is optional.

- Research dashboard: Activity studies (one method, comparison, learning curve, posture) over 4 activities with simulated 40-person group; working test screen (click, dwell, switch scanning) whose sessions overlay the charts; activity_study.csv and my_test_sessions.csv.

- Roles: demo sign-in picker (participant, care team, researcher); Research workspace naming with role bar; Care team view (#care) with suggestions; profile "My data and sharing" (tests, research consent, care access, approve suggestions, download).
- Wheelchair driving simulator placeholder on Simulators page (#wheelchair-sim), reusing the banner animation via window.wcSim(stage, canvas); real inputs to come.

- Recreation lab (#lab): experimental ISATMA apps (Songboards, Speaking Boards, ergometers, Dance Board, Motion Lab, camera test) published as-is under website/lab/, with search and filters; MediaPipe versions pinned in isatma_ergometer_v4.

- Lab: Musical Dial v9.1 (built-in Web Audio synth, sound unlock, wedge dwell, fit-to-screen, stuck-note fix, breath preset sync); MIDI optional.
- Lab: Mouse Orchestra v6.1 (sound unlock, touch taps, hover delay, clipboard share, safe names, phone layout).
- Lab: Virtual Harmonica v7.1 (start gate unlocks audio + camera, internal synth default, mouse/touch mode, no-face note release, pinned MediaPipe, responsive).
- Lab: thumbnails on cards (website/lab/shots), Works in progress labels, Song Boards Suite description section; home Recreation lab band; Musical Dial v9.2 Follow the Melody.
- Lab: in-site app player (iframe overlay) so apps open inside the page; new-tab link optional.
- Mouse Orchestra v6.2: slow score (9–90 px/s, default 18), pause, playhead cue lights matching mouse.
- Lab: Mini Color Keyboard (built-in synth + MIDI, phone fit) and MIDI Edition preset JSON.
- 2026-11-03: Virtual Training Environment region (#vte) added as a major section; first environment vte/pointing.html (6 levels, mouse/eye/head/nose/1- and 2-switch, CSV + test sessions). Rec lab nav replaced by Training Environment; Recreation lab is a tile inside the VTE.
