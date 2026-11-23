// Human-check riddles. `img` is the Picsum photo id (served from /img/<id>.jpg).
// Answers are compared case-insensitively, ignoring punctuation, spaces and a
// leading a/an/the; number words (zero..twelve) match their digits.
module.exports = [
  { img: 102, q: 'You have 4 red berries and share half with a friend. How many do you keep?', a: ['2'] },
  { img: 104, q: 'A dreamcatcher hangs above your bed to protect you while you do what at night?', a: ['sleep', 'sleeping', 'asleep'] },
  { img: 124, q: 'Which one can float across the ocean: a boat or a bicycle?', a: ['boat'] },
  { img: 129, q: 'Which shape do people draw to say "I love you": a square or a heart?', a: ['heart'] },
  { img: 133, q: 'Each of 2 cool cars has 4 wheels. How many wheels are there in all?', a: ['8'] },
  { img: 152, q: 'Roses are red, violets are ...? (what color?)', a: ['blue', 'purple', 'violet'] },
  { img: 159, q: 'What falls from the clouds and leaves tiny drops on leaves?', a: ['rain'] },
  { img: 164, q: 'Venice has canals instead of streets. In which country is it?', a: ['italy', 'italia'] },
  { img: 167, q: 'In which season do many leaves fall from the trees?', a: ['autumn', 'fall'] },
];
