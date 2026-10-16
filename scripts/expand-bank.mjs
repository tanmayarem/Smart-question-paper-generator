import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const bankPath = path.join(__dirname, "..", "src", "questions.json");

const base = JSON.parse(fs.readFileSync(bankPath, "utf8"));

const relabel = {
  B08: { difficulty: "Medium", marks: 1 },
  C08: { difficulty: "Medium", marks: 1 },
  P08: { difficulty: "Easy", marks: 1 },
};

for (const q of base) {
  if (relabel[q.id]) Object.assign(q, relabel[q.id]);
}

function mcq(id, topic, difficulty, prompt, options, answer) {
  return {
    id,
    subject: "Science",
    topic,
    difficulty,
    type: "MCQ",
    marks: 1,
    prompt,
    options,
    answer,
  };
}

function sa(id, topic, difficulty, marks, prompt, answer) {
  return {
    id,
    subject: "Science",
    topic,
    difficulty,
    type: "Short Answer",
    marks,
    prompt,
    options: null,
    answer,
  };
}

function la(id, topic, difficulty, marks, prompt, answer) {
  return {
    id,
    subject: "Science",
    topic,
    difficulty,
    type: "Long Answer",
    marks,
    prompt,
    options: null,
    answer,
  };
}

const additions = [
  // Biology B13–B30
  mcq("B13", "Biology", "Easy", "Which organelle is the site of aerobic respiration in eukaryotic cells?", ["Mitochondrion", "Nucleus", "Golgi body", "Ribosome"], "Mitochondrion"),
  mcq("B14", "Biology", "Easy", "Which gas is taken in by plants for photosynthesis?", ["Carbon dioxide", "Nitrogen", "Hydrogen", "Methane"], "Carbon dioxide"),
  sa("B15", "Biology", "Easy", 2, "Name the four main types of teeth in humans.", "Incisors, canines, premolars and molars."),
  mcq("B16", "Biology", "Medium", "Which blood vessel carries blood away from the heart?", ["Artery", "Vein", "Capillary", "Lymph vessel"], "Artery"),
  sa("B17", "Biology", "Medium", 3, "Explain why enzymes are described as biological catalysts.", "They speed up biochemical reactions without being used up; they lower activation energy and are specific to particular substrates."),
  mcq("B18", "Biology", "Medium", "Which adaptation helps xerophytes reduce water loss?", ["Thick waxy cuticle", "Broad thin leaves", "Large air spaces", "Hollow stems"], "Thick waxy cuticle"),
  la("B19", "Biology", "Medium", 4, "Describe the path of blood through the human heart in one complete circuit.", "Deoxygenated blood enters the right atrium, passes to the right ventricle, is pumped to the lungs via the pulmonary artery, returns oxygenated to the left atrium, passes to the left ventricle, and is pumped to the body via the aorta."),
  sa("B20", "Biology", "Medium", 2, "State two ways vaccination helps control infectious disease.", "It stimulates memory cells for faster future response; it reduces susceptible individuals so spread is harder."),
  mcq("B21", "Biology", "Hard", "A student observes stomata mostly on the lower epidermis. Which inference is best supported?", ["It reduces transpiration while allowing gas exchange", "It increases photosynthesis rate only", "It stops all water loss", "It removes the need for roots"], "It reduces transpiration while allowing gas exchange"),
  la("B22", "Biology", "Hard", 5, "Explain how natural selection can lead to antibiotic resistance in bacteria.", "Variation exists; antibiotics kill susceptible bacteria; resistant survivors reproduce; repeated use selects resistant strains; resistance alleles become common in the population over generations."),
  sa("B23", "Biology", "Hard", 3, "Compare the functions of red blood cells and white blood cells.", "Red blood cells transport oxygen using haemoglobin; white blood cells defend the body, e.g. by phagocytosis or antibody production."),
  mcq("B24", "Biology", "Easy", "Which structure in a plant cell provides turgor support?", ["Vacuole", "Chloroplast", "Centriole", "Lysosome"], "Vacuole"),
  sa("B25", "Biology", "Easy", 2, "Define the term habitat.", "The place where an organism lives."),
  mcq("B26", "Biology", "Medium", "Which hormone helps regulate blood sugar by promoting glucose uptake in cells?", ["Insulin", "Adrenaline", "Thyroxine", "Oestrogen"], "Insulin"),
  la("B27", "Biology", "Medium", 4, "Explain the role of the nervous system in a reflex action.", "A receptor detects a stimulus; sensory neurones carry impulses to the CNS; a relay neurone in the spinal cord coordinates; motor neurones carry impulses to an effector that produces a rapid response."),
  mcq("B28", "Biology", "Hard", "In a food web, removal of a top predator most directly increases population of its prey because:", ["Predation pressure falls", "Photosynthesis stops", "Decomposers disappear", "Nutrients leave the soil"], "Predation pressure falls"),
  sa("B29", "Biology", "Hard", 3, "Explain why monoculture farming can reduce biodiversity.", "One crop dominates; fewer niches and food sources; pesticides may harm non-target species; genetic uniformity reduces resilience."),
  la("B30", "Biology", "Hard", 5, "Describe how the kidney nephron contributes to osmoregulation.", "Filtration in glomerulus; selective reabsorption in tubules returns glucose, ions and water; collecting duct adjusts water reabsorption under ADH control to produce concentrated or dilute urine."),

  // Chemistry C13–C30
  mcq("C13", "Chemistry", "Easy", "Which state symbol represents a solid?", ["(s)", "(l)", "(g)", "(aq)"], "(s)"),
  mcq("C14", "Chemistry", "Easy", "Which gas makes up most of the air?", ["Nitrogen", "Oxygen", "Carbon dioxide", "Argon only"], "Nitrogen"),
  sa("C15", "Chemistry", "Easy", 2, "What is meant by a compound?", "A substance containing atoms of two or more elements chemically bonded in fixed proportions."),
  mcq("C16", "Chemistry", "Medium", "Which separation technique uses different solubilities in a solvent on paper?", ["Chromatography", "Filtration", "Evaporation", "Sieving"], "Chromatography"),
  sa("C17", "Chemistry", "Medium", 3, "Balance the equation: H₂ + O₂ → H₂O (state whole-number coefficients).", "2H₂ + O₂ → 2H₂O"),
  mcq("C18", "Chemistry", "Medium", "Which particle is gained by a non-metal when it forms an ionic bond with a metal?", ["Electron", "Proton", "Neutron", "Nucleus"], "Electron"),
  la("C19", "Chemistry", "Medium", 4, "Describe the arrangement and movement of particles in a gas compared with a solid.", "Gas particles are far apart with random rapid motion; solid particles are close in a fixed arrangement vibrating about positions; gas is compressible, solid is not."),
  sa("C20", "Chemistry", "Medium", 2, "State the relative charge and mass of a neutron.", "Neutron has no electric charge and relative mass about 1."),
  mcq("C21", "Chemistry", "Hard", "A metal reacts with dilute acid to produce hydrogen. Which conclusion is valid?", ["The metal is above hydrogen in the reactivity series", "The metal is below gold", "The acid cannot ionise", "No chemical change occurred"], "The metal is above hydrogen in the reactivity series"),
  la("C22", "Chemistry", "Hard", 5, "Explain how electrolysis of molten ionic compound MX produces elements at each electrode.", "Positive ions migrate to cathode, gain electrons and are reduced to metal; negative ions migrate to anode, lose electrons and are oxidised; external circuit carries electrons; compound decomposes."),
  sa("C23", "Chemistry", "Hard", 3, "Calculate the relative formula mass of CO₂. (C=12, O=16)", "12 + 2×16 = 44."),
  mcq("C24", "Chemistry", "Easy", "Which apparatus is used to measure volume of a liquid accurately in a lab?", ["Burette or measuring cylinder", "Tripod", "Wire gauze", "Crucible tongs"], "Burette or measuring cylinder"),
  sa("C25", "Chemistry", "Easy", 2, "Define an acid in terms of pH.", "A substance with pH less than 7 in aqueous solution."),
  mcq("C26", "Chemistry", "Medium", "Which change increases the rate of reaction by providing more frequent collisions?", ["Increasing concentration", "Decreasing temperature", "Adding inhibitor", "Using larger container only"], "Increasing concentration"),
  la("C27", "Chemistry", "Medium", 4, "Compare ionic and covalent bonding in terms of electron transfer or sharing.", "Ionic: electrons transferred forming oppositely charged ions attracted electrostatically. Covalent: atoms share pairs of electrons to achieve stable outer shells."),
  mcq("C28", "Chemistry", "Hard", "When copper(II) oxide reacts with dilute sulfuric acid, the salt formed is:", ["Copper(II) sulfate", "Copper metal", "Sulfur dioxide only", "Copper hydroxide gas"], "Copper(II) sulfate"),
  sa("C29", "Chemistry", "Hard", 3, "Explain why aluminium is extracted by electrolysis but iron is obtained by reduction with carbon.", "Aluminium is very reactive; carbon cannot reduce its oxide at practical cost; electrolysis forces reduction. Iron oxide is reduced by carbon/carbon monoxide in the blast furnace."),
  la("C30", "Chemistry", "Hard", 5, "Describe the test for carbon dioxide and explain the chemical basis of the observation.", "Bubble gas through limewater; turns milky due to formation of insoluble calcium carbonate when CO₂ reacts with calcium hydroxide."),

  // Physics P13–P30
  mcq("P13", "Physics", "Easy", "What is the SI unit of power?", ["Watt", "Joule", "Newton", "Ohm"], "Watt"),
  mcq("P14", "Physics", "Easy", "Which quantity is scalar?", ["Speed", "Velocity", "Force", "Displacement"], "Speed"),
  sa("P15", "Physics", "Easy", 2, "Define acceleration.", "Rate of change of velocity."),
  mcq("P16", "Physics", "Medium", "A 10 N force acts on 2 kg mass. What is the acceleration?", ["5 m/s²", "20 m/s²", "0.2 m/s²", "12 m/s²"], "5 m/s²"),
  sa("P17", "Physics", "Medium", 3, "Calculate work done when a 50 N force moves an object 4 m in the force direction.", "W = F × s = 50 × 4 = 200 J."),
  mcq("P18", "Physics", "Medium", "Which device converts electrical energy to kinetic energy in a fan?", ["Motor", "Generator", "Transformer", "Fuse"], "Motor"),
  la("P19", "Physics", "Medium", 4, "Describe the energy transfers when a ball is dropped and bounces.", "Gravitational potential to kinetic as it falls; on impact some kinetic becomes thermal/sound and deforms ball; remaining kinetic lifts it again as elastic/gravitational potential."),
  sa("P20", "Physics", "Medium", 2, "State one difference between mass and weight.", "Mass is the amount of matter (kg); weight is the gravitational force (N) on that mass."),
  mcq("P21", "Physics", "Hard", "Two identical bulbs in parallel on a 6 V battery each have:", ["Full battery p.d. across each", "Half the battery p.d.", "Zero current", "Double the resistance of one alone"], "Full battery p.d. across each"),
  la("P22", "Physics", "Hard", 5, "Explain why a satellite in circular orbit has changing velocity but constant speed.", "Speed is magnitude of velocity; direction changes continuously due to centripetal force toward Earth; velocity is a vector so changing direction means changing velocity even if speed is constant."),
  sa("P23", "Physics", "Hard", 3, "A 2 kg object has momentum 10 kg·m/s. Calculate its speed.", "p = mv so v = p/m = 10/2 = 5 m/s."),
  mcq("P24", "Physics", "Easy", "Which colour of visible light has the longest wavelength?", ["Red", "Violet", "Blue", "Green"], "Red"),
  sa("P25", "Physics", "Easy", 2, "What is the function of a fuse in a domestic circuit?", "It breaks the circuit if current exceeds a safe value, preventing overheating and fire."),
  mcq("P26", "Physics", "Medium", "Sound travels fastest in:", ["Solids", "Vacuum", "Thin air at high altitude only", "All media equally"], "Solids"),
  la("P27", "Physics", "Medium", 4, "Describe how to plot a distance–time graph from experimental data and find speed.", "Measure distance at known times; plot distance on y-axis, time on x; draw best line; speed equals gradient of straight section."),
  mcq("P28", "Physics", "Hard", "A transformer with 100 turns primary and 500 turns secondary is step-up. If primary p.d. is 12 V, secondary is approximately:", ["60 V", "2.4 V", "12 V", "500 V"], "60 V"),
  sa("P29", "Physics", "Hard", 3, "Explain why lubricating a machine reduces wasted energy.", "Reduces friction so less work becomes thermal energy at surfaces; more input energy does useful work."),
  la("P30", "Physics", "Hard", 5, "Using ray diagrams, explain how a converging lens forms a real image of a distant object.", "Parallel rays refract through lens to meet at focal plane; inverted reduced real image forms on screen side; object beyond 2F gives image between F and 2F."),
];

const ids = new Set(base.map((q) => q.id));
for (const q of additions) {
  if (ids.has(q.id)) throw new Error(`Duplicate id ${q.id}`);
  ids.add(q.id);
}

const merged = [...base, ...additions];
fs.writeFileSync(bankPath, JSON.stringify(merged, null, 2) + "\n", "utf8");
console.log(`Bank size: ${merged.length} questions`);
