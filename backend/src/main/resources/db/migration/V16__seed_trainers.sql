WITH seeded_trainers (
  id,
  first_name,
  last_name,
  email,
  phone,
  bio,
  specialisations,
  experience_years,
  profile_photo_url
) AS (
  VALUES
    (
      '11111111-1111-1111-1111-111111111101'::uuid,
      'Amelia',
      'Stone',
      'amelia.stone@gymflow.local',
      '+14155550101',
      'Amelia leads high-energy strength sessions with a focus on sustainable progress, clean technique, and confidence under load.',
      ARRAY['Strength Training', 'Functional Fitness', 'Mobility']::text[],
      12,
      'https://picsum.photos/seed/gymflow-trainer-amelia/600/800'
    ),
    (
      '11111111-1111-1111-1111-111111111102'::uuid,
      'Marco',
      'Alvarez',
      'marco.alvarez@gymflow.local',
      '+14155550102',
      'Marco blends boxing footwork, conditioning, and interval programming to help members build endurance without losing form.',
      ARRAY['HIIT', 'Boxing Conditioning', 'Cardio']::text[],
      9,
      'https://picsum.photos/seed/gymflow-trainer-marco/600/800'
    ),
    (
      '11111111-1111-1111-1111-111111111103'::uuid,
      'Priya',
      'Nair',
      'priya.nair@gymflow.local',
      '+14155550103',
      'Priya coaches mindful movement and breath-led practice, specialising in mobility-focused yoga for busy professionals.',
      ARRAY['Yoga', 'Mobility', 'Breathwork']::text[],
      11,
      'https://picsum.photos/seed/gymflow-trainer-priya/600/800'
    ),
    (
      '11111111-1111-1111-1111-111111111104'::uuid,
      'Jordan',
      'Kim',
      'jordan.kim@gymflow.local',
      '+14155550104',
      'Jordan designs athletic performance programs that combine explosive power, sprint mechanics, and injury-aware recovery work.',
      ARRAY['Athletic Performance', 'Strength Training', 'Recovery']::text[],
      8,
      NULL
    ),
    (
      '11111111-1111-1111-1111-111111111105'::uuid,
      'Sofia',
      'Rossi',
      'sofia.rossi@gymflow.local',
      '+14155550105',
      'Sofia specialises in core control and posture-first coaching, making Pilates accessible for beginners and advanced members alike.',
      ARRAY['Pilates', 'Core', 'Posture']::text[],
      7,
      'https://picsum.photos/seed/gymflow-trainer-sofia/600/800'
    ),
    (
      '11111111-1111-1111-1111-111111111106'::uuid,
      'Ethan',
      'Brooks',
      'ethan.brooks@gymflow.local',
      '+14155550106',
      'Ethan focuses on barbell fundamentals, movement quality, and progressive overload for members returning to structured training.',
      ARRAY['Powerlifting', 'Strength Training', 'Technique']::text[],
      10,
      'https://picsum.photos/seed/gymflow-trainer-ethan/600/800'
    ),
    (
      '11111111-1111-1111-1111-111111111107'::uuid,
      'Layla',
      'Haddad',
      'layla.haddad@gymflow.local',
      '+14155550107',
      'Layla builds low-impact conditioning classes around stability, balance, and joint-friendly movement patterns.',
      ARRAY['Low Impact', 'Mobility', 'Functional Fitness']::text[],
      6,
      NULL
    ),
    (
      '11111111-1111-1111-1111-111111111108'::uuid,
      'Noah',
      'Bennett',
      'noah.bennett@gymflow.local',
      '+14155550108',
      'Noah coaches indoor cycling and endurance blocks with data-informed pacing, cadence work, and clear progression cues.',
      ARRAY['Cycling', 'Cardio', 'Endurance']::text[],
      5,
      'https://picsum.photos/seed/gymflow-trainer-noah/600/800'
    ),
    (
      '11111111-1111-1111-1111-111111111109'::uuid,
      'Mina',
      'Park',
      'mina.park@gymflow.local',
      '+14155550109',
      'Mina combines dance conditioning, flexibility work, and upbeat coaching to keep group sessions technical and welcoming.',
      ARRAY['Dance Fitness', 'Flexibility', 'Cardio']::text[],
      4,
      'https://picsum.photos/seed/gymflow-trainer-mina/600/800'
    ),
    (
      '11111111-1111-1111-1111-111111111110'::uuid,
      'Daniel',
      'Okafor',
      'daniel.okafor@gymflow.local',
      '+14155550110',
      'Daniel works with members on kettlebell flow, unilateral strength, and practical conditioning for everyday resilience.',
      ARRAY['Kettlebells', 'Functional Fitness', 'Conditioning']::text[],
      13,
      NULL
    )
)
UPDATE trainers AS t
SET
  first_name = st.first_name,
  last_name = st.last_name,
  email = st.email,
  phone = st.phone,
  bio = st.bio,
  specialisations = st.specialisations,
  experience_years = st.experience_years,
  profile_photo_url = st.profile_photo_url,
  deleted_at = NULL,
  updated_at = NOW()
FROM seeded_trainers AS st
WHERE t.id = st.id OR t.email = st.email;

WITH seeded_trainers (
  id,
  first_name,
  last_name,
  email,
  phone,
  bio,
  specialisations,
  experience_years,
  profile_photo_url
) AS (
  VALUES
    (
      '11111111-1111-1111-1111-111111111101'::uuid,
      'Amelia',
      'Stone',
      'amelia.stone@gymflow.local',
      '+14155550101',
      'Amelia leads high-energy strength sessions with a focus on sustainable progress, clean technique, and confidence under load.',
      ARRAY['Strength Training', 'Functional Fitness', 'Mobility']::text[],
      12,
      'https://picsum.photos/seed/gymflow-trainer-amelia/600/800'
    ),
    (
      '11111111-1111-1111-1111-111111111102'::uuid,
      'Marco',
      'Alvarez',
      'marco.alvarez@gymflow.local',
      '+14155550102',
      'Marco blends boxing footwork, conditioning, and interval programming to help members build endurance without losing form.',
      ARRAY['HIIT', 'Boxing Conditioning', 'Cardio']::text[],
      9,
      'https://picsum.photos/seed/gymflow-trainer-marco/600/800'
    ),
    (
      '11111111-1111-1111-1111-111111111103'::uuid,
      'Priya',
      'Nair',
      'priya.nair@gymflow.local',
      '+14155550103',
      'Priya coaches mindful movement and breath-led practice, specialising in mobility-focused yoga for busy professionals.',
      ARRAY['Yoga', 'Mobility', 'Breathwork']::text[],
      11,
      'https://picsum.photos/seed/gymflow-trainer-priya/600/800'
    ),
    (
      '11111111-1111-1111-1111-111111111104'::uuid,
      'Jordan',
      'Kim',
      'jordan.kim@gymflow.local',
      '+14155550104',
      'Jordan designs athletic performance programs that combine explosive power, sprint mechanics, and injury-aware recovery work.',
      ARRAY['Athletic Performance', 'Strength Training', 'Recovery']::text[],
      8,
      NULL
    ),
    (
      '11111111-1111-1111-1111-111111111105'::uuid,
      'Sofia',
      'Rossi',
      'sofia.rossi@gymflow.local',
      '+14155550105',
      'Sofia specialises in core control and posture-first coaching, making Pilates accessible for beginners and advanced members alike.',
      ARRAY['Pilates', 'Core', 'Posture']::text[],
      7,
      'https://picsum.photos/seed/gymflow-trainer-sofia/600/800'
    ),
    (
      '11111111-1111-1111-1111-111111111106'::uuid,
      'Ethan',
      'Brooks',
      'ethan.brooks@gymflow.local',
      '+14155550106',
      'Ethan focuses on barbell fundamentals, movement quality, and progressive overload for members returning to structured training.',
      ARRAY['Powerlifting', 'Strength Training', 'Technique']::text[],
      10,
      'https://picsum.photos/seed/gymflow-trainer-ethan/600/800'
    ),
    (
      '11111111-1111-1111-1111-111111111107'::uuid,
      'Layla',
      'Haddad',
      'layla.haddad@gymflow.local',
      '+14155550107',
      'Layla builds low-impact conditioning classes around stability, balance, and joint-friendly movement patterns.',
      ARRAY['Low Impact', 'Mobility', 'Functional Fitness']::text[],
      6,
      NULL
    ),
    (
      '11111111-1111-1111-1111-111111111108'::uuid,
      'Noah',
      'Bennett',
      'noah.bennett@gymflow.local',
      '+14155550108',
      'Noah coaches indoor cycling and endurance blocks with data-informed pacing, cadence work, and clear progression cues.',
      ARRAY['Cycling', 'Cardio', 'Endurance']::text[],
      5,
      'https://picsum.photos/seed/gymflow-trainer-noah/600/800'
    ),
    (
      '11111111-1111-1111-1111-111111111109'::uuid,
      'Mina',
      'Park',
      'mina.park@gymflow.local',
      '+14155550109',
      'Mina combines dance conditioning, flexibility work, and upbeat coaching to keep group sessions technical and welcoming.',
      ARRAY['Dance Fitness', 'Flexibility', 'Cardio']::text[],
      4,
      'https://picsum.photos/seed/gymflow-trainer-mina/600/800'
    ),
    (
      '11111111-1111-1111-1111-111111111110'::uuid,
      'Daniel',
      'Okafor',
      'daniel.okafor@gymflow.local',
      '+14155550110',
      'Daniel works with members on kettlebell flow, unilateral strength, and practical conditioning for everyday resilience.',
      ARRAY['Kettlebells', 'Functional Fitness', 'Conditioning']::text[],
      13,
      NULL
    )
)
INSERT INTO trainers (
  id,
  first_name,
  last_name,
  email,
  phone,
  bio,
  specialisations,
  experience_years,
  profile_photo_url
)
SELECT
  st.id,
  st.first_name,
  st.last_name,
  st.email,
  st.phone,
  st.bio,
  st.specialisations,
  st.experience_years,
  st.profile_photo_url
FROM seeded_trainers AS st
WHERE NOT EXISTS (
  SELECT 1
  FROM trainers AS t
  WHERE t.id = st.id OR t.email = st.email
);
