import type { LiquidityFieldKey } from '../src/types/finance'

type RatioKey = 'current_ratio' | 'quick_ratio' | 'cash_ratio'

export type LiveRatioCase = {
  sampleId: string
  expectedFields: Partial<Record<LiquidityFieldKey, number | null>>
  expectedRatios: Partial<Record<RatioKey, number | null>>
}

export const liveRatioCases: LiveRatioCase[] = [
  {
    sampleId: 'capacity-canada-2024',
    expectedFields: {
      cash_and_cash_equivalents: 1491966,
      marketable_securities: 500000,
      accounts_receivable: 59827,
      total_current_assets: 2071608,
      total_current_liabilities: 1444409,
    },
    expectedRatios: {
      current_ratio: 1.4342253475296818,
      quick_ratio: 1.4205069339778416,
      cash_ratio: 1.3790872252942208,
    },
  },
  {
    sampleId: 'growing-chefs-ontario-2025',
    expectedFields: {
      cash_and_cash_equivalents: 290421,
      marketable_securities: null,
      accounts_receivable: 162996,
      inventory: 18528,
      total_current_assets: 525280,
      total_current_liabilities: 296566,
    },
    expectedRatios: {
      current_ratio: 1.7712077581381547,
      quick_ratio: 1.5288907022382876,
      cash_ratio: 0.9792794858480068,
    },
  },
  {
    sampleId: 'huntington-society-2025',
    expectedFields: {
      cash_and_cash_equivalents: 802313,
      marketable_securities: 2687643,
      accounts_receivable: 137008,
      total_current_assets: 3771654,
      total_current_liabilities: 261613,
    },
    expectedRatios: {
      current_ratio: 14.416921177464422,
      quick_ratio: 13.863852331497288,
      cash_ratio: 13.34014746973583,
    },
  },
  {
    sampleId: 'threads-of-life-2024',
    expectedFields: {
      cash_and_cash_equivalents: 192686,
      marketable_securities: 3300000,
      accounts_receivable: 11590,
      total_current_assets: 3636743,
      total_current_liabilities: 161419,
    },
    expectedRatios: {
      current_ratio: 22.529832299791227,
      quick_ratio: 21.709191606935985,
      cash_ratio: 21.637390889548318,
    },
  },
  {
    sampleId: 'la-leche-league-canada-2025',
    expectedFields: {
      cash_and_cash_equivalents: 16081,
      marketable_securities: 237322,
      accounts_receivable: 4301,
      total_current_assets: 258092,
      total_current_liabilities: 12461,
    },
    expectedRatios: {
      current_ratio: 20.711981381911563,
      quick_ratio: 20.680844234010113,
      cash_ratio: 20.335687344514888,
    },
  },
  {
    sampleId: 'alzheimer-society-canada-2025',
    expectedFields: {
      cash_and_cash_equivalents: 4635136,
      marketable_securities: 364961,
      accounts_receivable: 643827,
      total_current_assets: 5873931,
      total_current_liabilities: 8954360,
    },
    expectedRatios: {
      current_ratio: 0.6559855757418732,
      quick_ratio: 0.6302989828418781,
      cash_ratio: 0.5583980317968007,
    },
  },
  {
    sampleId: 'shine-foundation-2024',
    expectedFields: {
      cash_and_cash_equivalents: 323894,
      marketable_securities: 5000,
      accounts_receivable: 74738,
      total_current_assets: 451109,
      total_current_liabilities: 90308,
    },
    expectedRatios: {
      current_ratio: 4.995227443858794,
      quick_ratio: 4.469504362847145,
      cash_ratio: 3.6419143376002125,
    },
  },
  {
    sampleId: 'donner-canadian-foundation-2024',
    expectedFields: {
      cash_and_cash_equivalents: 1166474,
      marketable_securities: 6986834,
      accounts_receivable: 276606,
      total_current_assets: 8480093,
      total_current_liabilities: 344492,
    },
    expectedRatios: {
      current_ratio: 24.616226211348884,
      quick_ratio: 24.47056535420271,
      cash_ratio: 23.66762653414303,
    },
  },
  {
    sampleId: 'bgc-canada-2024',
    expectedFields: {
      cash_and_cash_equivalents: 6905025,
      marketable_securities: null,
      accounts_receivable: 286421,
      total_current_assets: 8724987,
      total_current_liabilities: 7911168,
    },
    expectedRatios: {
      current_ratio: 1.1028696394767499,
      quick_ratio: 0.9090245586998026,
      cash_ratio: 0.872819917362392,
    },
  },
  {
    sampleId: 'canadian-constitution-foundation-2025',
    expectedFields: {
      cash_and_cash_equivalents: 3129068,
      marketable_securities: 1655620,
      accounts_receivable: 118479,
      total_current_assets: 4953411,
      total_current_liabilities: 1301766,
    },
    expectedRatios: {
      current_ratio: 3.805147007987611,
      quick_ratio: 3.766550209484654,
      cash_ratio: 3.6755361562677162,
    },
  },
  {
    sampleId: 'parkinson-canada-2024',
    expectedFields: {
      cash_and_cash_equivalents: 1999272,
      marketable_securities: 5389468,
      accounts_receivable: 893575,
      total_current_assets: 8522051,
      total_current_liabilities: 1835591,
    },
    expectedRatios: {
      current_ratio: 4.642674212283673,
      quick_ratio: 4.512069954581386,
      cash_ratio: 4.025264887439522,
    },
  },
  {
    sampleId: 'easter-seals-canada-2025',
    expectedFields: {
      cash_and_cash_equivalents: 2428172,
      marketable_securities: null,
      accounts_receivable: 3226,
      total_current_assets: 2487158,
      total_current_liabilities: 680433,
    },
    expectedRatios: {
      current_ratio: 3.6552577549883676,
      quick_ratio: 3.5733099364669263,
      cash_ratio: 3.5685688377841758,
    },
  },
  {
    sampleId: 'food-bank-waterloo-region-2025',
    expectedFields: {
      cash_and_cash_equivalents: 7969251,
      marketable_securities: 12438874,
      accounts_receivable: 437097,
      total_current_assets: 20999214,
      total_current_liabilities: 797811,
    },
    expectedRatios: {
      current_ratio: 26.321038441435377,
      quick_ratio: 26.128020295533656,
      cash_ratio: 25.580149935260355,
    },
  },
  {
    sampleId: 'food-banks-canada-2024',
    expectedFields: {
      cash_and_cash_equivalents: 17017007,
      marketable_securities: 19004184,
      accounts_receivable: 7241551,
      inventory: 1094520,
      total_current_assets: 44357262,
      total_current_liabilities: 16056065,
    },
    expectedRatios: {
      current_ratio: 2.7626483824025376,
      quick_ratio: 2.6944797495525834,
      cash_ratio: 2.243463202222961,
    },
  },
  {
    sampleId: 'jack-org-2024',
    expectedFields: {
      cash_and_cash_equivalents: 683205,
      marketable_securities: 2566618,
      accounts_receivable: 206355,
      total_current_assets: 3569426,
      total_current_liabilities: 1151689,
    },
    expectedRatios: {
      current_ratio: 3.099296771958402,
      quick_ratio: 3.000964670149667,
      cash_ratio: 2.8217886946910147,
    },
  },
  {
    sampleId: 'canadian-foodgrains-bank-2025',
    expectedFields: {
      cash_and_cash_equivalents: 49089550,
      marketable_securities: null,
      accounts_receivable: 564440,
      total_current_assets: 49882434,
      total_current_liabilities: 24200547,
    },
    expectedRatios: {
      current_ratio: 2.0612110131229677,
      quick_ratio: 2.0517713917788716,
      cash_ratio: 2.028447952023564,
    },
  },
  {
    sampleId: 'right-to-food-2025',
    expectedFields: {
      cash_and_cash_equivalents: 9415325,
      marketable_securities: 45000,
      accounts_receivable: 166363,
      total_current_assets: 10097689,
      total_current_liabilities: 4441329,
    },
    expectedRatios: {
      current_ratio: 2.2735737433547483,
      quick_ratio: 2.167524180262259,
      cash_ratio: 2.130066248188324,
    },
  },
  {
    sampleId: 'daily-bread-food-bank-2025',
    expectedFields: {
      cash_and_cash_equivalents: 20816420,
      marketable_securities: 2878644,
      accounts_receivable: 573543,
      inventory: 606975,
      total_current_assets: 25240270,
      total_current_liabilities: 2253099,
    },
    expectedRatios: {
      current_ratio: 11.20246824484854,
      quick_ratio: 10.77121200621899,
      cash_ratio: 10.516654616596963,
    },
  },
  {
    sampleId: 'ccrw-2025',
    expectedFields: {
      cash_and_cash_equivalents: 2167067,
      marketable_securities: 3083151,
      accounts_receivable: 356138,
      total_current_assets: 5997637,
      total_current_liabilities: 2846809,
    },
    expectedRatios: {
      current_ratio: 2.1067929039145232,
      quick_ratio: 1.969347434267631,
      cash_ratio: 1.844246663545043,
    },
  },
  {
    sampleId: 'childrens-literacy-foundation-2025',
    expectedFields: {
      cash_and_cash_equivalents: 1524220,
      marketable_securities: null,
      accounts_receivable: 139341,
      total_current_assets: 1699093,
      total_current_liabilities: 1374080,
    },
    expectedRatios: {
      current_ratio: 1.236531351886353,
      quick_ratio: 1.210672595482068,
      cash_ratio: 1.1092658360503027,
    },
  },
  {
    sampleId: 'cnewa-canada-2024',
    expectedFields: {
      cash_and_cash_equivalents: 1812716,
      marketable_securities: null,
      accounts_receivable: 31249,
      total_current_assets: 1928148,
      total_current_liabilities: 462571,
    },
    expectedRatios: {
      current_ratio: 4.168328753856165,
      quick_ratio: 3.986339394384862,
      cash_ratio: 3.9187843595902034,
    },
  },
  {
    sampleId: 'ecf-2023',
    expectedFields: {
      cash_and_cash_equivalents: 6058,
      marketable_securities: null,
      accounts_receivable: 2152,
      total_current_assets: 8210,
      total_current_liabilities: 27625,
    },
    expectedRatios: {
      current_ratio: 0.2971945701357466,
      quick_ratio: 0.2971945701357466,
      cash_ratio: 0.21929411764705883,
    },
  },
  {
    sampleId: 'community-foundations-canada-2022',
    expectedFields: {
      cash_and_cash_equivalents: 126929642,
      marketable_securities: 4193233,
      accounts_receivable: 390495,
      total_current_assets: 131585951,
      total_current_liabilities: 131795916,
    },
    expectedRatios: {
      current_ratio: 0.9984068929723133,
      quick_ratio: 0.997856185467841,
      cash_ratio: 0.9948933091371359,
    },
  },
  {
    sampleId: 'canadian-red-cross-2025',
    expectedFields: {
      cash_and_cash_equivalents: 211182,
      marketable_securities: null,
      accounts_receivable: 91485,
      inventory: 17700,
      total_current_assets: 350613,
      total_current_liabilities: 208838,
    },
    expectedRatios: {
      current_ratio: 1.6788754920081594,
      quick_ratio: 1.4492908378743332,
      cash_ratio: 1.0112240109558606,
    },
  },
  {
    sampleId: 'ymca-canada-2024',
    expectedFields: {
      cash_and_cash_equivalents: 6150190,
      marketable_securities: null,
      accounts_receivable: 764486,
      total_current_assets: 7211483,
      total_current_liabilities: 3059076,
    },
    expectedRatios: {
      current_ratio: 2.3574056349041346,
      quick_ratio: 2.2603805855101347,
      cash_ratio: 2.0104730971051388,
    },
  },
  {
    sampleId: 'united-way-sdg-2025',
    expectedFields: {
      cash_and_cash_equivalents: 552628,
      marketable_securities: 221266,
      accounts_receivable: 23225,
      total_current_assets: 815080,
      total_current_liabilities: 264154,
    },
    expectedRatios: {
      current_ratio: 3.085624294918873,
      quick_ratio: 3.01762986742582,
      cash_ratio: 2.9297076705255267,
    },
  },
  {
    sampleId: 'ymca-greater-toronto-2025',
    expectedFields: {
      cash_and_cash_equivalents: 79112,
      marketable_securities: null,
      accounts_receivable: 37438,
      total_current_assets: 118372,
      total_current_liabilities: 99256,
    },
    expectedRatios: {
      current_ratio: 1.1925928911098573,
      quick_ratio: 1.1742363182074635,
      cash_ratio: 0.79705005238978,
    },
  },
  {
    sampleId: 'ymca-bc-2024',
    expectedFields: {
      cash_and_cash_equivalents: 1489203,
      marketable_securities: null,
      accounts_receivable: 4113207,
      total_current_assets: 7665724,
      total_current_liabilities: 39937421,
    },
    expectedRatios: {
      current_ratio: 0.19194339063606536,
      quick_ratio: 0.14027971410572557,
      cash_ratio: 0.037288411788032085,
    },
  },
  {
    sampleId: 'nature-conservancy-canada-2024',
    expectedFields: {
      cash_and_cash_equivalents: 43232932,
      marketable_securities: 65000000,
      accounts_receivable: 19022549,
      total_current_assets: 127255481,
      total_current_liabilities: 88034558,
    },
    expectedRatios: {
      current_ratio: 1.445517350129707,
      quick_ratio: 1.445517350129707,
      cash_ratio: 1.2294368763684824,
    },
  },
  {
    sampleId: 'heart-and-stroke-2024',
    expectedFields: {
      cash_and_cash_equivalents: 131140,
      marketable_securities: null,
      accounts_receivable: 4550,
      inventory: 619,
      total_current_assets: 137132,
      total_current_liabilities: 45163,
    },
    expectedRatios: {
      current_ratio: 3.0363793370679537,
      quick_ratio: 3.004450545800766,
      cash_ratio: 2.9037043597635233,
    },
  },
]
