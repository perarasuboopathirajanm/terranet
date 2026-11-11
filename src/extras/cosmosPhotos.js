// Real pictures shown when a body is clicked in the Cosmos map. Images are
// public-domain NASA/ESA pictures, or CC BY 4.0 where the caption says so.
// A caption that starts "Artist's concept" is not a photo and says so.
const DIR = '/textures/cosmos/';

const photo = (file, caption) => ({ src: `${DIR}${file}.jpg`, caption });

export const COSMOS_PHOTOS = Object.freeze({
  Sun: photo(
    'sun',
    'Real image: the Sun in visible light with sunspots, Solar Dynamics Observatory (NASA/SDO/HMI, CC BY 4.0)',
  ),
  Mercury: photo(
    'mercury',
    'Real image: Mercury in enhanced colour, MESSENGER (NASA/JHUAPL/Carnegie Institution)',
  ),
  Venus: photo(
    'venus',
    'Real image: Venus in ultraviolet light, Mariner 10 (NASA)',
  ),
  Earth: photo(
    'earth',
    'Real image: Earth, Blue Marble 2012, Suomi NPP satellite (NASA Earth Observatory)',
  ),
  Moon: photo(
    'moon',
    'Real image: the full Moon seen by the Apollo 17 crew (NASA)',
  ),
  Mars: photo(
    'mars',
    'Real image: Mars, Hubble Space Telescope (NASA and the Hubble Heritage Team)',
  ),
  Jupiter: photo(
    'jupiter',
    'Real image: Jupiter, Cassini spacecraft (NASA/JPL/University of Arizona)',
  ),
  Saturn: photo(
    'saturn',
    'Real image: Saturn and its rings, Cassini spacecraft (NASA/JPL/Space Science Institute)',
  ),
  Uranus: photo(
    'uranus',
    'Real image: Uranus in true colour, Voyager 2 (NASA/JPL)',
  ),
  Neptune: photo('neptune', 'Real image: Neptune, Voyager 2 (NASA/JPL)'),
  'Sagittarius A*': photo(
    'sgr-a-star',
    'Real image: the black hole at the centre of our galaxy, Event Horizon Telescope (EHT Collaboration, CC BY 4.0)',
  ),
  'M87*': photo(
    'm87-star',
    'Real image: the first black hole ever imaged, Event Horizon Telescope (EHT Collaboration, CC BY 4.0)',
  ),
  'Cygnus X-1': photo(
    'cygnus-x-1',
    "Artist's concept (not a photo): Cygnus X-1 pulling gas from its blue companion star (NASA, ESA, M. Kornmesser, CC BY 4.0)",
  ),
  'Gaia BH1': photo(
    'gaia-bh1',
    "Artist's concept (not a photo): Gaia BH1 and its Sun-like companion (International Gemini Observatory/NOIRLab/NSF/AURA/J. da Silva, CC BY 4.0)",
  ),
  'Large Magellanic Cloud': photo(
    'lmc',
    "Real image: the Large and Small Magellanic Clouds over Earth's horizon, taken from the International Space Station (NASA)",
  ),
  'Small Magellanic Cloud': photo(
    'smc',
    'Real image: the Small Magellanic Cloud in infrared, Herschel, Planck, IRAS and COBE (NASA/JPL-Caltech/ESA)',
  ),
  'Andromeda (M31)': photo(
    'andromeda',
    'Real image: the Andromeda Galaxy, NASA space telescope (NASA/JPL-Caltech)',
  ),
  'Triangulum (M33)': photo(
    'triangulum',
    'Real image: the Triangulum Galaxy, Spitzer Space Telescope (NASA/JPL-Caltech)',
  ),
  'Sculptor (NGC 253)': photo(
    'sculptor',
    'Real image: the Sculptor Galaxy in infrared, WISE (NASA/JPL-Caltech/UCLA)',
  ),
  'M81 (Bode)': photo(
    'm81',
    "Real image: Bode's Galaxy, Hubble Space Telescope (NASA, ESA and the Hubble Heritage Team)",
  ),
  'Centaurus A': photo(
    'centaurus-a',
    'Real image: Centaurus A, Spitzer Space Telescope (NASA/JPL-Caltech)',
  ),
  'Pinwheel (M101)': photo(
    'pinwheel',
    'Real image: the Pinwheel Galaxy, NASA space telescopes (NASA/JPL-Caltech)',
  ),
  'Whirlpool (M51)': photo(
    'whirlpool',
    'Real image: the Whirlpool Galaxy, Spitzer Space Telescope (NASA/JPL-Caltech)',
  ),
  'Proxima Centauri': photo(
    'proxima',
    'Real image: Proxima Centauri, Hubble Space Telescope (ESA/Hubble and NASA, CC BY 4.0)',
  ),
  "Barnard's Star": photo(
    'barnards-star',
    "Real image: the sky around Barnard's Star, the fastest-moving star in our sky (ESO/Digitized Sky Survey 2, CC BY 4.0)",
  ),
  Sirius: photo(
    'sirius',
    'Real image: Sirius A, with its faint white-dwarf companion Sirius B, Hubble Space Telescope (NASA, ESA, H. Bond (STScI), M. Barstow (University of Leicester))',
  ),
  Procyon: photo(
    'procyon',
    'Real image: Procyon and its faint companion Procyon B, amateur telescope (Giuseppe Donatiello, CC0)',
  ),
  Pollux: photo('pollux', 'Real image: Pollux in a telescope photo (CC0)'),
  Arcturus: photo(
    'arcturus',
    'Real image: Arcturus, Digitized Sky Survey (NASA/STScI/ESO, processed by Roberto Mura, CC BY-SA 4.0)',
  ),
  Capella: photo(
    'capella',
    'Real image: Capella, Digitized Sky Survey (NASA/STScI/ESO, processed by Roberto Mura, CC BY-SA 4.0)',
  ),
  Aldebaran: photo(
    'aldebaran',
    'Real image: Aldebaran, Digitized Sky Survey 2 (NASA, ESA and STScI, CC BY-SA 4.0)',
  ),
  Regulus: photo(
    'regulus',
    'Real image: Regulus and its faint companion (Legacy Surveys / D. Lang, Perimeter Institute, CC BY 4.0)',
  ),
  Spica: photo(
    'spica',
    'Real image: Spica, Digitized Sky Survey (NASA/STScI/ESO, processed by Roberto Mura, CC BY-SA 4.0)',
  ),
  Antares: photo(
    'antares',
    'Real image: Antares (bright star, lower right) among the Rho Ophiuchi clouds, WISE and Digitized Sky Survey (Giuseppe Donatiello, CC0)',
  ),
  Rigel: photo(
    'rigel',
    'Real image: the Witch Head Nebula, lit by the light of Rigel (NASA/STScI Digitized Sky Survey, Noel Carboni)',
  ),
  Deneb: photo(
    'deneb',
    'Real image: Deneb, Digitized Sky Survey (NASA/STScI/ESO, processed by Roberto Mura, CC BY-SA 4.0)',
  ),
  'A0620-00': photo(
    'a0620-00',
    'Real image: the sky around the black hole A0620-00 (marked), Sloan Digital Sky Survey (CC BY 4.0)',
  ),
  'V404 Cygni': photo(
    'v404-cygni',
    'Real image: X-ray rings of dust around V404 Cygni, Swift X-ray telescope (Andrew Beardmore, University of Leicester, and NASA/Swift)',
  ),
  'Sagittarius Dwarf': photo(
    'sagittarius-dwarf',
    'Real image: Gaia all-sky star map with the Sagittarius dwarf galaxy marked (ESA/Gaia/DPAC, CC BY-SA 3.0 IGO)',
  ),
  'Sombrero (M104)': photo(
    'sombrero',
    'Real image: the Sombrero Galaxy, Hubble Space Telescope (NASA/ESA and the Hubble Heritage Team)',
  ),
  'Virgo A (M87)': photo(
    'virgo-a',
    'Real image: the giant galaxy M87 (Virgo A), Hubble Space Telescope (NASA, ESA and the Hubble Heritage Team)',
  ),
  'Coma Cluster': photo(
    'coma-cluster',
    'Real image: the Coma Cluster of galaxies, Dark Energy Camera (CTIO/NOIRLab/DOE/NSF/AURA, CC BY 4.0)',
  ),
  'Cartwheel Galaxy': photo(
    'cartwheel',
    'Real image: the Cartwheel Galaxy, Webb and Hubble (NASA, ESA, CSA, STScI)',
  ),
});

/** The picture file and caption for a clicked body, or null. */
export function cosmosPhoto(name) {
  return COSMOS_PHOTOS[name] ?? null;
}
