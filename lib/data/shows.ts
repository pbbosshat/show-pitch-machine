// Canonical static show data — single source of truth for all 40 MYE shows.
//
// WHY this file exists: show content (description, YouTube ID, network logo) was
// previously inlined inside app/(public)/shows/[slug]/page.tsx. Extracting it here
// lets both the slug detail page AND any future page that needs show metadata
// (e.g. search, newsletter confirmation) import from one place without duplication.
//
// The grid index page (shows/page.tsx) still queries the site_shows DB table for
// display order and image URLs — that CMS-driven data lives in Postgres. This file
// is the authoritative source for show *content* only: description, YouTube embed
// ID, and network logo. If a show's description or network changes, edit here.

export type ShowData = {
  slug: string;
  title: string;
  titleImgSrc: string;
  youtubeId: string;
  description: string;
  logoSrc: string;
  logoAlt: string;
  logoHref: string;
};

export const SHOWS: ShowData[] = [
  {
    slug: 'ghost-adventures',
    title: 'Ghost Adventures',
    titleImgSrc: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e81b453eb680504dc1d36_Ghost%20Adventures%20copy.png',
    youtubeId: 'fvws2umKwGY',
    description: `The stars of the award winning documentary feature, Ghost Adventures, hit the road searching for the most evil, sinister and haunted locations in the US to investigate, and put themselves face to face with the evil spirits who have documented reports of injuries to the living.

During the investigations, they use their trademark "raw" technique while inside these haunted locations.

Starring Zak Bagans, Aaron Goodwin, Billy Tolley and Jay Wasley.`,
    logoSrc: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8e8b2c6bbe853695d916_travel%20channel.png',
    logoAlt: 'travel channel logo',
    logoHref: 'https://www.travelchannel.com/',
  },
  {
    slug: 'destination-fear',
    title: 'Destination Fear',
    titleImgSrc: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/6371457ba2ecca4391eb7c00_destination%20fear.png',
    youtubeId: 'rL4R8pkQXws',
    description: `GHOST ADVENTURES spin-off with Paranormal investigator Dakota Laden, his best friend Tanner, and older sister Chelsea, spend the night in 10 of America's most haunted locations.

They will self-document their journey to give the viewer a 1st person perspective in a raw, truly authentic way to investigate the hauntings and stories that have become legends over the years.`,
    logoSrc: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8e8b2c6bbe853695d916_travel%20channel.png',
    logoAlt: 'travel channel logo',
    logoHref: 'https://www.travelchannel.com/',
  },
  {
    slug: 'billy-buys-brooklyn',
    title: 'Billy Buys Brooklyn',
    titleImgSrc: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/63deb3a111b873829a9d008c_billy%20buys%20brooklyn%20show%20page%20header.png',
    youtubeId: '7uGF0qXnBrw',
    description: `Billy Buys Brooklyn follows Billy Leroy, a dealer and collector of rare and unique items.

The show features Billy has he scours the borough of Brooklyn, New York in search of valuable finds, which he then restores and sells for profit.`,
    logoSrc: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8e8853eb68c398dcf2ac_DISCOVERY%20CHANNEL.png',
    logoAlt: 'discovery channel logo',
    logoHref: 'https://www.discovery.com/',
  },
  {
    slug: 'legacy-list',
    title: 'Legacy List',
    titleImgSrc: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e826cbc22fc385c382e52_Legacy%20List%20copy.png',
    youtubeId: 'XnS_80BwNyk',
    description: `Organizing expert Matt Paxton (A&E's "Hoarders") and his clutter-cleaning team offer a unique and compelling new series about our homes, the hidden treasures, heirlooms and precious memories to be found within them.

As Baby Boomers downsize their own homes or settle the estates of family members they will discover the most important museum in the world…. their family's basement.

The items on this legacy list may be lost in families' attics, closets and even under the floorboards and must be found, valued and saved before the movers come, the home is emptied and valuables and memories are lost forever.`,
    logoSrc: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8e8aed58056074c5cde7_PBS.png',
    logoAlt: 'pbs logo',
    logoHref: 'https://www.pbs.org/',
  },
  {
    slug: 'ghost-adventures-screaming-room',
    title: 'Ghost Adventures: Screaming Room',
    titleImgSrc: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e81f59e7350aa7627fd43_Ghost%20Adventures%20-%20Screaming%20Room.png',
    youtubeId: 'EjRWMowFJcQ',
    description: `In this all-new series, Zak Bagans, Aaron Goodwin, Jay Wasley and Billy Tolley gather in their screening room and get candid about their most iconic investigations, including Branson's Titanic Museum, Goatman's Bridge in Texas, the unforgettable Island of the Dolls and more.

Away from the haunted locations we usually see them in, with no equipment or investigations, it's just the team, some munchies and never-before-heard stories from the moments that created a legacy.`,
    logoSrc: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8e8b2c6bbe853695d916_travel%20channel.png',
    logoAlt: 'travel channel logo',
    logoHref: 'https://www.travelchannel.com/',
  },
  {
    slug: 'pros-vs-joes',
    title: 'Pros vs Joes',
    titleImgSrc: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e844f34ed9e2608c8afe4_Pros%20vs%20Joes%20copy.png',
    youtubeId: 'J_RceMB9n1M',
    description: `Some of the biggest names in sports from the last two decades take on their biggest loudmouth fans and cocky couch potatoes who tormented them throughout their careers – claiming "they could do it better!"

In each episode, regular guys compete against incredible legends such as Jerry Rice, Dennis Rodman, Roy Jones Jr., Michael Irvin, Darryl Strawberry, Ricky Williams, & Hakeem Olajuwon to see if they truly have what it takes to beat the professionals!`,
    logoSrc: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8e8b9e735045be28be64_SPIKE.png',
    logoAlt: 'spike tv logo',
    logoHref: 'https://www.paramountnetwork.com/',
  },
  {
    slug: 'sin-city-justice',
    title: 'Sin City Justice',
    titleImgSrc: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e84f943d13cc372cbdf1c_Sin%20City%20Justice%20copy.png',
    youtubeId: 'HgMVBSiMuXg',
    description: `Sin City Justice offers exclusive and unprecedented access to the Las Vegas District Attorney's Office, following the strip's most high profile and compelling cases in real time, as they unfold, from crime to conviction – as prosecuted by a diverse and dynamic team of real attorneys who seek justice in the city infamous for sin.`,
    logoSrc: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8e88d44a43a5c5a55109_investigation%20discovery.png',
    logoAlt: 'investigation discovery logo',
    logoHref: 'https://www.investigationdiscovery.com/',
  },
  {
    slug: 'food-boats',
    title: 'Food Boats',
    titleImgSrc: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e813ba6a75cc55bebd7d5_Food%20Boats%202.png',
    youtubeId: '8P4KZWCegaA',
    description: `The sea-bound chefs create fantastic flavors aboard their floating eateries, attracting loyal customers addicted to these delicious dining experiences with idyllic backdrops.

Whether it's slow roasted shawarma overlooking the Miami skyline or gourmet pizza baked in the US Virgin Islands, from flounder to mile high burgers to fettuccini, these chefs cook the cuisine right on board to instantly satisfy a boater's most unusual cravings while out on the water!`,
    logoSrc: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8e8853eb6890cddcf2ae_FOOD%20NETWORK.png',
    logoAlt: 'food network logo',
    logoHref: 'https://www.foodnetwork.com/',
  },
  {
    slug: 'paranormal-challenge',
    title: 'Paranormal Challenge',
    titleImgSrc: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/637145812c89f76018b2b5db_paranormal%20challenge.png',
    youtubeId: 'fEOrViocY28',
    description: `Paranormal Challenge pits two teams of amateur ghost hunters against each other during an overnight lockdown in a legendary haunted location.

At the end of the lockdown, the teams present their findings to Zak Bagans (the lead investigator of Ghost Adventures) and a panel of three nationally recognized paranormal experts. The winners are the ones judged best on teamwork, their use of technology and the evidence collected.`,
    logoSrc: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8e8b2c6bbe853695d916_travel%20channel.png',
    logoAlt: 'travel channel logo',
    logoHref: 'https://www.travelchannel.com/',
  },
  {
    slug: 'mansons-bloodline',
    title: "Manson's Bloodline",
    titleImgSrc: "https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e827934ed9ebe6ac8919b_Manson%27s%20Bloodline%20copy.png",
    youtubeId: 'qORb7NsO2oc',
    description: `This is Jason Freeman's story, the only living blood relative of Charles Manson.

In MANSON'S BLOODLINE, we follow his journey as he comes to terms with his family legacy. Jason opens up in a personal and revealing way to an off-camera interviewer, and provides an exclusive and firsthand account of what he's been through ever since he discovered the family blood that runs through his veins.

His journey has been one into hell and back, a mind trip of self-discovery, of what really happened to his father and who Charles Manson really was. It's a journey that nearly cost Jason his sanity and his marriage, one that tested his resolve and nearly bankrupted him, financially and spiritually.`,
    logoSrc: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8e8a34ed9e90a1c943eb_REELZ.png',
    logoAlt: 'reelz logo',
    logoHref: 'https://www.reelz.com/',
  },
  {
    slug: 'ghost-adventures-live',
    title: 'Ghost Adventures: Live',
    titleImgSrc: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/6371457d0ce0bd90c7438a6c_ghost%20adventures%20live.png',
    youtubeId: 'Bce_W2fr9IA',
    description: `Ghost Adventures Crew – Zak, Nick and Aaron – lock themselves overnight in one of America's most haunted locations – The Trans-Allegheny Lunatic Asylum – for the most ambitious LIVE-broadcast paranormal investigation ever attempted.

For 7 hours, the Ghost Adventure crew has unprecedented access to the entire asylum, from the seclusion cells where the most violent patients were shackled, to the Medical Center where primitive 'ice-pick' lobotomies were performed by the hundreds.

As always, the crew is padlocked inside the facility, unable to escape as they record their experiences. To aid in their investigations, they can call on help from EVP recording specialists Mark and Debbie Constantino, medium Chris Fleming, and the hi-tech spirit-detecting systems of Bill Chappell.

Three lucky fans join the crew on their hunt – through the midnight hour – if they dare. Viewers at home have complete access to the investigation as it occurs, monitoring fixed webcams throughout the building and chatting online with the team while they're still locked down.`,
    logoSrc: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8e8b2c6bbe853695d916_travel%20channel.png',
    logoAlt: 'travel channel logo',
    logoHref: 'https://www.travelchannel.com/',
  },
  {
    slug: 'the-jane-doe-murders',
    title: 'The Jane Doe Murders',
    titleImgSrc: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/63deb2e201f0365681c4c246_vlcsnap-2023-02-04-14h08m25s377.png',
    youtubeId: 'ULem0AGGzzs',
    description: `A true crime series broadcast, The Jane Doe Murders focuses on the investigation of unidentified murder victims, also known as "Jane Doe" cases.

Each episode highlights a different case, exploring the efforts of law enforcement to identify the victim and solve the crime. The series aims to shed light on these forgotten victims and bring attention to their stories in an effort to help solve their cases.`,
    logoSrc: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8e8a92aded6fa14432e3_OXYGEN.png',
    logoAlt: 'oxygen network logo',
    logoHref: 'https://www.oxygen.com/',
  },
  {
    slug: 'biker-battles',
    title: 'Biker Battles',
    titleImgSrc: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8091d44a430f82a48866_Biker%20Battles%20copy.png',
    youtubeId: 'HLt1-9OxzLs',
    description: `Airing as a special on CMT, Biker Battles highlighted the most insane and outrageous competitions that take place at The Sturgis Motorcycle Rally each year.

Hosted by Big Jay Oakerson, the show highlighted everything from a makeshift bikini competition and a tattoo challenge, to a bike build, a burnout contest and even a vertical motorcycle hill climb.`,
    logoSrc: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8e8875a7c1515a3393e6_CMT.png',
    logoAlt: 'cmt logo',
    logoHref: 'https://www.cmt.com/',
  },
  {
    slug: 'baggage-battles',
    title: 'Baggage Battles',
    titleImgSrc: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/6371457a63d6535cce882450_baggage%20battles.png',
    youtubeId: '1Oe7hx7p52A',
    description: `Baggage Battles is a documentary series about the highly competitive and unknown world of Lost Property Auctions.

The show follows expert buyers as they travel the globe in search of treasures buried at the bottom of luggage left behind at airports, packages lost in the mail, items seized by customs, and unclaimed safety deposit boxes.

Every city has an auction – and every auction has its own extraordinary story. Starring Billy Leroy, Mark Meyer, and Laurence and Sally Martin.`,
    logoSrc: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8e8b2c6bbe853695d916_travel%20channel.png',
    logoAlt: 'travel channel logo',
    logoHref: 'https://www.travelchannel.com/',
  },
  {
    slug: 'you-only-live-once',
    title: 'You Only Live Once',
    titleImgSrc: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e869b230d2c26297c8229_You%20Only%20Live%20Once%20copy.png',
    youtubeId: 'WxxDi6dK1rE',
    description: `Travel to some of the most unexpected and incredible places on Earth with former rescue helicopter pilot Mikey Kay as he searches for once-in-a-lifetime adventures.

Mikey engages the locals and uncovers hidden secrets of often overlooked travel destinations to discover the most extreme, the most interesting and the most sensational adventures most people would never dream of attempting.

Everyone loves a great adventure, so why not? You Only Live Once!`,
    logoSrc: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8e8b2c6bbe853695d916_travel%20channel.png',
    logoAlt: 'travel channel logo',
    logoHref: 'https://www.travelchannel.com/',
  },
  {
    slug: 'ghost-adventures-serial-killer-spirits',
    title: 'Ghost Adventures: Serial Killer Spirits',
    titleImgSrc: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/6371457e01967330bcc62b59_ghost%20adventures%20serial%20killer%20spirits.png',
    youtubeId: 'tYEOpEC_fs8',
    description: `In this special four-part miniseries, the Ghost Adventures Crew embark on a terrifying cross-country journey searching for haunted locations associated with America's most notorious serial killers.

As they delve into each case, they'll retrace the killer's steps, visit known hangouts, and speak with leading experts to get insight on why these sociopaths kill… again, and again.

Then they'll investigate locations that are a hotbed of negative and evil hauntings resulting from the residual energy that was imprinted from the serial killers.`,
    logoSrc: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8e8b2c6bbe853695d916_travel%20channel.png',
    logoAlt: 'travel channel logo',
    logoHref: 'https://www.travelchannel.com/',
  },
  {
    slug: 'pregnant-and-platonic',
    title: 'Pregnant and Platonic',
    titleImgSrc: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e844194d7efd3462a179d_Pregnant%20and%20Platonic%20copy.png',
    youtubeId: '24vBFVyHEPE',
    description: `Pregnant & Platonic is a ground breaking new format/social experiment based on a very real and growing phenomenon – women and men who are looking to have a child without falling in love.

It's a radical new way to start a family and the stakes couldn't be higher – two strangers making a lifelong commitment to have and raise a child together. This is the new Modern Family.

Co-created and developed with Israeli producer Assaf Gil and based on his own personal story, the format has been optioned in: France, Germany, Spain, Italy, Australia, Sweden, Finland and the U.K. – a series commission by a major broadcaster is soon to be announced.`,
    logoSrc: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e9e956e474e3f871d0ac4_bbc.png',
    logoAlt: 'bbc logo',
    logoHref: 'https://www.bbcamerica.com/',
  },
  {
    slug: 'hidden-assets',
    title: 'Hidden Assets',
    titleImgSrc: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e824b4f23e8b777c4f212_Hidden%20Assets%20copy.png',
    youtubeId: 'dpYpt3t_8Io',
    description: `Matt Paxton and his clutter-cleaning team turns a traumatic time in a family's life – the process of moving out of a house that's been "home" for decades – into a treasure-finding trip through a life well lived, full of priceless memories … and potentially pricey finds!

Viewers dig into the amazing process of uncovering family histories, discovering the stories behind timeless items, and executing highly profitable transactions. A transactional series with history.`,
    logoSrc: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8e899e7350688f28be5b_KEW%20MEDIA%20GROUP.png',
    logoAlt: 'kew media group logo',
    logoHref: '',
  },
  {
    slug: 'king-of-vegas',
    title: 'King of Vegas',
    titleImgSrc: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e825d341fb5d3f79b2a3a_King%20of%20Vegas%20copy.png',
    youtubeId: 'hWnpYSJGjVI',
    description: `Spike TV is on the hunt for America's greatest gambler. Contestants compete in every an exciting array of casino games, to be crowned the "King of Vegas."`,
    logoSrc: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8e8b9e735045be28be64_SPIKE.png',
    logoAlt: 'spike tv logo',
    logoHref: 'https://www.paramountnetwork.com/',
  },
  {
    slug: 'ghost-adventures-haunted-museum-live',
    title: 'Ghost Adventures: Haunted Museum Live',
    titleImgSrc: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/6371457f0ce0bdad06438a95_haunted%20museum%20live.png',
    youtubeId: 'xN8Jt7Sv2l0',
    description: `One of the most historical nights in Paranormal History – a four-hour special event on Halloween night, LIVE, from Zak Bagans' Haunted Museum in Las Vegas!

Never before has such a massive collection of occult artifacts been assembled under one roof, creating unprecedented paranormal energy that has produced unexplained sightings, hauntings, occurrences and physical and mind-altering attacks throughout the last year at the museum. Zak and the Ghost Adventures Crew, along with special guests, face this energy head-on, as they are LOCKED INSIDE the museum for the duration of the live show.

Luckily, host, Josh Gates, is outside the museum walls to simultaneously guide us through all live action as the night unfolds. All the action is captured Live, on the more than 70 cameras, equipped with night vision monitoring every angle of the Museum's 33 rooms.

Dozens of microphones, and an array of the most advanced technical visual / audio paranormal detection instruments available ensure that not a beat, orb, ghost, or unexplained event is missed. Police and ambulances also stand by.`,
    logoSrc: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8e8b2c6bbe853695d916_travel%20channel.png',
    logoAlt: 'travel channel logo',
    logoHref: 'https://www.travelchannel.com/',
  },
  {
    slug: 'wild-and-crazy-kids',
    title: 'Wild & Crazy Kids',
    titleImgSrc: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8673fddd92929651e304_wild%20and%20crazy%20kids.jpg',
    youtubeId: 'VKW43vKvSzg',
    description: `A classic '90's Nickelodeon game show where large teams of kids competed head-to-head in fun and exciting physical challenges. Hosted by Omar Gooding, Donnie Jeffcoat, Annette Chavez and Jessica Gaynes.`,
    logoSrc: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8e8a94d7ef1ce62aa6bc_NICKELODEON.png',
    logoAlt: 'nickelodeon logo',
    logoHref: 'https://www.nick.com/',
  },
  {
    slug: 'breaking-borders',
    title: 'Breaking Borders',
    titleImgSrc: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e809ea0b43284c72ad372_Breaking%20Borders%20copy.png',
    youtubeId: 'lbVxpB2HVA0',
    description: `Peabody Award-winning journalist Mariana van Zeller and Top Chef winner Michael Voltaggio travel to conflict zones around the globe with one goal — to gather people from all sides of the conflict around the dinner table, in order to break bread and discuss the issues that divide them.

Can breaking bread lead to Breaking Borders?`,
    logoSrc: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8e8b2c6bbe853695d916_travel%20channel.png',
    logoAlt: 'travel channel logo',
    logoHref: 'https://www.travelchannel.com/',
  },
  {
    slug: 'top-of-the-world',
    title: 'Top of the World',
    titleImgSrc: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8599341fb570db9b4c79_Top%20of%20the%20World%20copy.png',
    youtubeId: 'shJd7SBjtCw',
    description: `TOP OF THE WORLD takes us to the most gorgeous, epic, surprising locations to revel in the beauty of their unique views — while uncovering the unusual stories behind them.

TOP OF THE WORLD: "Alaska," "Hawaii" and "Beyond Vegas" will be hour episodes featuring multiple knockout views of the US, while "Mega Rides" and "Hotels" take us across the world for immersive, thrilling experiences, and once-in-a-lifetime panoramic views.`,
    logoSrc: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8e8b2c6bbe853695d916_travel%20channel.png',
    logoAlt: 'travel channel logo',
    logoHref: 'https://www.travelchannel.com/',
  },
  {
    slug: 'help-my-house-is-haunted',
    title: 'Help! My House Is Haunted',
    titleImgSrc: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e823da6a75c3001ebf071_Help!%20My%20House%20is%20Haunted%20copy.png',
    youtubeId: 'Quk-gpm6-q4',
    description: `Help! My House is Haunted! brings together three of the world's leading paranormal investigators: British ghost hunter and paranormal consultant Barri Ghai; Parisian investigator Sandy Lakdar; and American medium and paranormal expert Chris Fleming.

This unforgettable hour of programming goes beyond the ghostly activities famously found at historical monuments and tourist attractions and focuses instead on everyday people who have encountered supernatural phenomena in their homes and believe them to be haunted. Families present a case file to the experts who then research historical evidence.

With years of experience, this expert team of investigators stop at nothing to help families reclaim their homes.`,
    logoSrc: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8e8a53eb68051adcf2da_REALLY.png',
    logoAlt: 'really logo',
    logoHref: 'https://www.discoveryplus.com/gb/show/help-my-house-is-haunted',
  },
  {
    slug: 'wreck-chasers',
    title: 'Wreck Chasers',
    titleImgSrc: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/63714583913d0349ee55a4e5_wreck%20chasers.png',
    youtubeId: 'SfXo3WczFRA',
    description: `Philadelphia is the Wild West of tow trucking and the only city in the United States that allows "wreck chasing" – a multimillion-dollar business in which tow-truck drivers compete to claim wrecks and collect cash.

Working hand-in-hand with police and rescue crews, the wreck chasers encounter high-speed chases, witness serious accidents and are in constant competition with rivals.

Starring Mickey Caban, P.J. Augustine, Pam Augustine, Davante "Little Man" McKoy, Redz Elliot and Michelle Alvarado.`,
    logoSrc: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8e8853eb68c398dcf2ac_DISCOVERY%20CHANNEL.png',
    logoAlt: 'discovery channel logo',
    logoHref: 'https://www.discovery.com/',
  },
  {
    slug: 'red-alaska',
    title: 'Red Alaska',
    titleImgSrc: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e846b3bcb9c36fb330c03_Red%20Alaska%20copy.png',
    youtubeId: 'H4V2XmJhPrw',
    description: `In the tiny village of Nikolaevsk, Alaska exists a people carrying on a religion lost to time. Called the Old Believers, this sect of the Russian Orthodox church carries on long-forgotten traditions abandoned when the church enacted reforms.

Red Alaska follows the Old Believers of Nikolaevsk as they prepare for the thaw of winter and the start of salmon fishing season.`,
    logoSrc: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8e8aa7bb587d184d554b_national%20geographic.png',
    logoAlt: 'national geographic channel logo',
    logoHref: 'https://www.nationalgeographic.com/tv/',
  },
  {
    slug: 'shermans-warriors',
    title: "Sherman's Warriors",
    titleImgSrc: "https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e84e843d13c2c12cbde19_Sherman%27s%20Warriors%20copy.png",
    youtubeId: 'k4tncD-8Obw',
    description: `This NBC Sports Network docu-series follows former NFL coach Mike Sherman as he becomes head coach at Nauset High School and the challenges he faces to prepare his young team for battle on the gridiron.`,
    logoSrc: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8e8abc22fc925f38e82a_NBC%20SPORTS.png',
    logoAlt: 'nbc sports logo',
    logoHref: 'https://www.nbcsports.com/',
  },
  {
    slug: 'game-on-america',
    title: 'Game on America',
    titleImgSrc: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e815e34ed9e2fefc880b9_Game%20On%20America%20copy.png',
    youtubeId: 'ut--7lacjYg',
    description: `Game On America follows Sal Piacente as he travels the country revealing the inside scoop behind some of your favorite carnival and boardwalk games.

From the Basketball Toss to Skeeball to Monopoly and more, it's time for you to get the winning edge.`,
    logoSrc: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8e8b2c6bbe853695d916_travel%20channel.png',
    logoAlt: 'travel channel logo',
    logoHref: 'https://www.travelchannel.com/',
  },
  {
    slug: 'ghost-adventures-aftershocks',
    title: 'Ghost Adventures: Aftershocks',
    titleImgSrc: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e81c4bc22fc708d3820c7_Ghost%20Adventures%20-%20Aftershocks.png',
    youtubeId: 'm8N1JIo3rw8',
    description: `Host Zak Bagans invites Ghost Adventures fan favorites out to Las Vegas to update viewers on how their lives — and their ghosts — have fared since the GAC paid them a visit. Have the ghosts returned to do these people harm?

Has their approach to the spirits changed? There is more to every story.`,
    logoSrc: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8e8b2c6bbe853695d916_travel%20channel.png',
    logoAlt: 'travel channel logo',
    logoHref: 'https://www.travelchannel.com/',
  },
  {
    slug: 'framed',
    title: 'Framed',
    titleImgSrc: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/6371457c2c89f75f26b2b544_framed.png',
    youtubeId: 'qJiJETWSIpU',
    description: `Everyone has a story, but what matters is who tells it. Framed follows an athlete and a celebrity who come together for the first time to make a short film – in two days. While both are novices in their roles as director and star, what they come up with is beyond compelling.`,
    logoSrc: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8e8853eb6823b5dcf2ad_IFC.png',
    logoAlt: 'ifc logo',
    logoHref: 'https://www.ifc.com/',
  },
  {
    slug: 'hall-pass',
    title: 'Hall Pass',
    titleImgSrc: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e821bc664e826346e907a_Hall%20Pass%20copy.png',
    youtubeId: 'Pf1p_olO5kQ',
    description: `Hall Pass is a ground breaking social experiment giving couples at a crossroads in their relationship the opportunity to find out if the grass is really greener on the other side.

In the format, couples grant each other 72 hours to do whatever they want with absolutely no consequences. Once they each see what their partner did during their Hall Pass, can they live up to their commitment that there would be no consequences?

In the end, will the experiment tear them apart or strengthen the relationship?

The format was co-created and developed with Phileas Productions in Spain. A pilot has been produced with Simpel Media in The Netherlands and the format is being distributed by The Story Lab.`,
    logoSrc: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8e8b53eb683710dcf2db_THE%20STORY%20LAB.png',
    logoAlt: 'the story lab logo',
    logoHref: 'https://www.storylab.com/',
  },
  {
    slug: 'charles-manson-the-funeral',
    title: 'Charles Manson: The Funeral',
    titleImgSrc: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/6371457a25366f4204e8eeec_charles%20manson%20the%20funeral.png',
    youtubeId: 'plRC8NRSINU',
    description: `Charles Manson: The Funeral tracks the journey of Jason Freeman, Charles Manson's grandson as he attempts to recover the remains of his grandfather after Manson's death, so he can give him a proper funeral.

On the journey, we look back at Jason's relationship with Manson and the evolution of his thinking about his grandfather.

We also see his encounters with supporters of Manson, whose opinion on the infamous murderer contrast with the wider public, as well as a former member of the Manson family who gives unique insight into one of the most notorious killers of the 20th century.`,
    logoSrc: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8e8b2c6bbe853695d916_travel%20channel.png',
    logoAlt: 'travel channel logo',
    logoHref: 'https://www.travelchannel.com/',
  },
  {
    slug: 'ghost-adventures-graveyard-of-the-pacific',
    title: 'Ghost Adventures: Graveyard of the Pacific',
    titleImgSrc: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e81d743d13c76c0cbc2e8_Ghost%20Adventures%20-%20Graveyard%20of%20the%20Pacific.png',
    youtubeId: 'nPfmjdN9K7c',
    description: `In this special four-part miniseries event, Zak Bagans, Aaron Goodwin, Billy Tolley and Jay Wasley head to the "Graveyard of the Pacific" – a treacherous nautical region within the Pacific Northwest where the freshwater of the Columbia River meets the Pacific Ocean.

Here, darkness plagues both land and sea – the ocean has claimed thousands of shipwrecks and countless lives, while unexplained deaths, diseases, fires and murders have impacted areas around the shoreline.

The investigation takes the team to multiple haunted locations – from the underground tunnels weaving beneath the city of Astoria, Oregon, and the port city's Norblad Hostel to the Fort Stevens Military Base outside of town where dangerous entities are believed to haunt various sites.

The investigation culminates at the North Head Lighthouse in Washington, which bore witness to some of the most tragic shipwrecks of this watery graveyard.`,
    logoSrc: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8e8b2c6bbe853695d916_travel%20channel.png',
    logoAlt: 'travel channel logo',
    logoHref: 'https://www.travelchannel.com/',
  },
  {
    slug: 'deadly-possessions',
    title: 'Deadly Possessions',
    titleImgSrc: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e80eaad7a061c78c53442_Deadly%20Possessions%20copy.png',
    youtubeId: 'cT69Zt7e8hc',
    description: `Zak Bagans, host of Ghost Adventures, is fulfilling a lifelong dream of opening a museum in downtown Las Vegas – full of the haunted and cursed objects he has been collecting through the years.

Each episode features the stories behind 3 haunted/iconic items and their owners.`,
    logoSrc: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8e8b2c6bbe853695d916_travel%20channel.png',
    logoAlt: 'travel channel logo',
    logoHref: 'https://www.travelchannel.com/',
  },
  {
    slug: 'what-would-you-do',
    title: 'What Would You Do?',
    titleImgSrc: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e86129e7350cfd2284408_What%20Would%20You%20Do.png',
    youtubeId: '2vBavjJcf2M',
    description: `An early 90s game show, What Would You Do? aired on Nickelodeon for two seasons, from 1991 to 1993.

The show, hosted by Marc Summers, was an audience-interactive show that included stunts, contests, and challenges that often resulted in the loser (and possibly winner as well) getting a cream pie to the face.`,
    logoSrc: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8e8a94d7ef1ce62aa6bc_NICKELODEON.png',
    logoAlt: 'nickelodeon logo',
    logoHref: 'https://www.nick.com/',
  },
  {
    slug: 'stolichnaya-presents-be-real',
    title: 'Stolichnaya Presents: Be Real',
    titleImgSrc: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/637145793e9741678501c884_be%20real.png',
    youtubeId: 'S1hzJQwUhhE',
    description: `Be Real is a documentary series in partnership with Stolichnaya that looked at the lives of extraordinary individuals within the LGBT community, and how they are an inspiration to the people around them.`,
    logoSrc: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8e89a7bb588d0c4d5549_LOGO.png',
    logoAlt: 'logo network logo',
    logoHref: 'https://www.logotv.com/',
  },
  {
    slug: 'student-bodies',
    title: 'Student Bodies',
    titleImgSrc: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/63714581c3c481fba9486faa_student%20bodies.png',
    youtubeId: '66Affm72RT8',
    description: `A syndicated TV comedy, Student Bodies mixed animation with live action as it featured an ensemble cast of high school students running the local newspaper at Thomas A. Edison High School.`,
    logoSrc: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8e8860e2143cf74beaf2_20th%20Television.png',
    logoAlt: '20th television logo',
    logoHref: 'https://20thtv.com/',
  },
  {
    slug: 'comedy-centrals-bar-mitzvah-bash',
    title: "Comedy Central's Bar Mitzvah Bash",
    titleImgSrc: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/6371457b60a89cd4e3b89669_comedy%20central%20bmb.png',
    youtubeId: 'P-bQ7VDQkbs',
    description: `What better way is there to celebrate a rite of passage than a bar mitzvah?

This hilarious special celebrated Comedy Central's 13th year in existence as a network, and featured a party dishing out comedy, music, and a retrospective of both the funniest and most controversial people and programs ever to be seen on the channel.

Celebrity appearances included Snoop Dogg, Jeff Ross, Adam Corolla, Dane Cook, and Dave Chappelle.`,
    logoSrc: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8e8834ed9efe05c943dc_COMEDY%20CENTRAL.png',
    logoAlt: 'comedy central logo',
    logoHref: 'https://www.cc.com/',
  },
  {
    slug: 'worlds-edge',
    title: "World's Edge",
    titleImgSrc: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/63deb2f31693d1ea61f122ad_vlcsnap-2023-02-04-14h07m28s590.png',
    youtubeId: 'sdGmXeZi6FI',
    description: `World's Edge journeyed across the globe to reveal the tenacity of humanity and the enduring nature of the human spirit in the aftermath of both natural and human-caused disasters.`,
    logoSrc: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8e8b2c6bbe853695d916_travel%20channel.png',
    logoAlt: 'travel channel logo',
    logoHref: 'https://www.travelchannel.com/',
  },
  {
    slug: 'pools-with-a-view',
    title: 'Pools with a View',
    titleImgSrc: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e842d60e21438524b4b4e_Pools%20with%20a%20View%20copy.png',
    youtubeId: 'Eh271uTArFE',
    description: `Premiering on The Travel Channel, Pools with a View explores the most spectacular and jaw-dropping pools from around the globe, from the Hanging Gardens of Bali to the Spas of Budapest to sunny Scottsdale, Arizona and more.

Come soak it all in!`,
    logoSrc: 'https://cdn.prod.website-files.com/631bb40f42caf4264eb9313e/631e8e8b2c6bbe853695d916_travel%20channel.png',
    logoAlt: 'travel channel logo',
    logoHref: 'https://www.travelchannel.com/',
  },
];
