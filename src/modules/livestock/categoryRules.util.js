// Categories that follow from age and castration. Each sex goes through its track; a castrated male
// goes through the steer track. The cut points are the age in months.
export const TRACKS = Object.freeze({
  female: ['Ternera', 'Vaquillona', 'Vaca'],
  male: ['Ternero', 'Torito', 'Toro'],
  castrated: ['Ternero', 'Novillito', 'Novillo'],
});

export const CALF_MONTHS = 12;
export const ADULT_MONTHS = 24;

// Whole months from birth to now
export function ageInMonths(birthDate, now) {
  const months = (now.getFullYear() - birthDate.getFullYear()) * 12
    + now.getMonth() - birthDate.getMonth();

  return now.getDate() < birthDate.getDate() ? months - 1 : months;
}

// Category the cow should have now (a name of TRACKS), or null to leave it as it is.
// - By age: calf until 12 months, then young (vaquillona, torito, novillito), and from 24 months
//   adult (toro, novillo). Vaquillona -> vaca is not by age (first calving): it stays manual.
// - It never goes back within a track: a category set by hand ahead of the age is kept.
// - Castration (or voiding it) moves a male to the other track, at the same step.
export function expectedCategory({
  sex, birthDate, castrated, current,
}, now = new Date()) {
  if (sex !== 'female' && sex !== 'male') {
    return null;
  }

  let track = TRACKS.female;
  if (sex === 'male') {
    track = castrated ? TRACKS.castrated : TRACKS.male;
  }

  const tracksOfSex = sex === 'male' ? [TRACKS.male, TRACKS.castrated] : [TRACKS.female];
  const currentStep = Math.max(...tracksOfSex.map((t) => t.indexOf(current)));

  let ageStep = -1;
  if (birthDate) {
    const months = ageInMonths(birthDate, now);
    if (months >= ADULT_MONTHS && sex === 'male') {
      ageStep = 2;
    } else {
      ageStep = months >= CALF_MONTHS ? 1 : 0;
    }
  }

  const step = Math.max(ageStep, currentStep);
  if (step < 0) {
    return null;
  }

  return track[step] === current ? null : track[step];
}
