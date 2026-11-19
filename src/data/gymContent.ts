import heroImg from '../assets/images/hero_gym_athletes_1794572812602.jpg';
import strengthImg from '../assets/images/program_strength_power_1794572812374.jpg';
import conditioningImg from '../assets/images/program_conditioning_hiit_1794572812456.jpg';
import midbannerImg from '../assets/images/midbanner_train_repeat_1794572812458.jpg';
import coachImg from '../assets/images/trainer_portrait_coach_1794572813549.jpg';
import floorImg from '../assets/images/gallery_gym_floor_1794572813309.jpg';

export const GYM_IMAGES = {
  hero: heroImg,
  strength: strengthImg,
  conditioning: conditioningImg,
  midbanner: midbannerImg,
  coach: coachImg,
  floor: floorImg,
};

export const TRAINERS = [
  {
    name: 'Subrato Bharati',
    role: 'Founder & Head Strength Coach',
    experience: '10+ Years Coaching · Competitive Bodybuilding & Powerlifting',
    bio: 'Specializes in barbell mechanics, progressive overload periodization, and contest-grade physique conditioning.',
    image: GYM_IMAGES.coach,
  },
  {
    name: 'Anirban Mukherjee',
    role: 'Hypertrophy & Mobility Coach',
    experience: '7 Years Coaching · K11 Certified',
    bio: 'Guides beginners and intermediate lifters through safe joint mechanics, muscle symmetry, and injury prevention.',
    image: GYM_IMAGES.midbanner,
  },
  {
    name: 'Ritika Sengupta',
    role: 'Conditioning & Nutrition Specialist',
    experience: '6 Years Coaching · Sports Nutritionist',
    bio: 'Designs practical Bengali/Indian household meal plans paired with high-output metabolic conditioning blocks.',
    image: GYM_IMAGES.conditioning,
  },
];

export const TESTIMONIALS = [
  {
    name: 'Sourav Mondal',
    role: 'Software Engineer, City Centre Durgapur',
    outcome: '-11 kg fat loss in 14 weeks',
    quote:
      'Before joining Muscle Arena I jumped between random routines with zero tracking. Coach Subrato fixed my squat and deadlift form in week one and gave me a realistic 2,100 kcal Indian meal structure.',
  },
  {
    name: 'Debolina Ghosh',
    role: 'Postgraduate Student, NIT Durgapur',
    outcome: '+35 kg deadlift PR in 4 months',
    quote:
      'Clean racks, zero intimidation, and trainers who actually watch your reps. The morning 6 AM batch fits my college schedule and keeps me consistent.',
  },
  {
    name: 'Kaustav Banerjee',
    role: 'Plant Operations Lead, DSP Township',
    outcome: 'Pain-free shoulder & +4 kg lean mass',
    quote:
      'The calibrated plates and structured 90-day program completely transformed my posture and upper-body strength after years of desk work.',
  },
];

export const FAQS = [
  {
    q: 'Do you offer a free trial before buying a membership?',
    a: 'Yes. You can book a 1-day trial session using the trial form below or visit us near Gopalmath Water Tank during gym hours with your ID.',
  },
  {
    q: 'How does the online UPI membership activation work?',
    a: 'Select a plan, submit the membership form, scan the dynamic UPI QR code (or tap Pay with UPI), and submit your 12-digit UTR number. Once our desk verifies the UTR, your membership becomes Active and you can download your PDF receipt.',
  },
  {
    q: 'Can I pay in cash or card at the gym front desk instead of UPI?',
    a: 'Yes. On the payment page, click "Pay at Gym Front Desk". This reserves your Pending membership ID so you can complete payment directly at reception.',
  },
  {
    q: 'What are the gym timings for morning and evening batches?',
    a: 'Muscle Arena is open Monday to Saturday from 5:30 AM to 10:00 PM, and Sunday from 6:00 AM to 12:00 PM.',
  },
  {
    q: 'Is general floor trainer guidance included in standard plans?',
    a: 'Yes, floor coaching for form checks and starter workout splits is included across Monthly, Quarterly, and Yearly plans.',
  },
];

export const FACILITIES = [
  {
    title: 'Calibrated Free-Weight Zone',
    detail: 'Competition-grade power racks, Olympic barbells, and dumbbells up to 50 kg.',
  },
  {
    title: 'Turf & Sled Conditioning Lane',
    detail: '20-meter indoor turf track with prowler sleds, battle ropes, and kettlebells.',
  },
  {
    title: 'Biomechanics Machine Lineup',
    detail: 'Plate-loaded chest, lat pulldown, cable crossover, and leg press stations.',
  },
  {
    title: 'Clean Locker & Hydration Area',
    detail: 'Sanitized changing rooms, filtered chilled water, and ventilated floor layout.',
  },
];
