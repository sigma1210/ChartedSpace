import type { LifepathTableDefinition } from "../../lifepathTypes";

export const benefitTables = [
{
  id: "free-trader.cash-benefits",
  label: "Free Trader Cash Benefits",
  kind: "roll",
  scope: "benefit",
  notation: "1d6",
  entries: [
    {
      id: "free-trader.cash-small",
      label: "Operating Cash",
      range: [1, 2],
      effects: [
        {
          id: "free-trader.cash-small.effect",
          type: "credit.add",
          payload: { amount: 10000 },
        },
      ],
    },
    {
      id: "free-trader.cash-large",
      label: "Strong Payout",
      range: [3, 6],
      effects: [
        {
          id: "free-trader.cash-large.effect",
          type: "credit.add",
          payload: { amount: 25000 },
        },
      ],
    },
  ],
},
{
  id: "free-trader.material-benefits",
  label: "Free Trader Material Benefits",
  kind: "roll",
  scope: "benefit",
  notation: "1d6",
  entries: [
    {
      id: "free-trader.middle-passage",
      label: "Middle Passage",
      range: [1, 3],
      effects: [
        {
          id: "free-trader.middle-passage.effect",
          type: "benefit.add",
          payload: { benefitType: "middle-passage", amount: 1 },
        },
      ],
    },
    {
      id: "free-trader.ship-share",
      label: "Free Trader Share",
      range: [4, 6],
      effects: [
        {
          id: "free-trader.ship-share.effect",
          type: "benefit.add",
          payload: { benefitType: "ship", value: "free_trader" },
        },
      ],
    },
  ],
},
{
  id: "agent.benefits",
  label: "Agent Benefits",
  kind: "roll",
  scope: "benefit",
  notation: "1d6",
  entries: [
    {
      id: "agent-cash",
      label: "Discretionary Funds",
      range: [1, 2],
      effects: [
        {
          id: "agent-cash.effect",
          type: "credit.add",
          payload: { amount: 12000 },
        },
      ],
    },
    {
      id: "agent-weapon",
      label: "Concealed Weapon",
      range: [3, 4],
      effects: [
        {
          id: "agent-weapon.effect",
          type: "benefit.add",
          payload: { benefitType: "weapon", value: "concealed pistol" },
        },
      ],
    },
    {
      id: "agent-passage",
      label: "High Passage",
      range: [5, 5],
      effects: [
        {
          id: "agent-passage.effect",
          type: "benefit.add",
          payload: { benefitType: "high-passage", amount: 1 },
        },
      ],
    },
    {
      id: "agent-contact-benefit",
      label: "Black File",
      range: [6, 6],
      effects: [
        {
          id: "agent-contact-benefit.effect",
          type: "relationship.add",
          payload: { relationshipType: "contact", label: "Protected source" },
        },
      ],
    },
  ],
},
{
  id: "scholar.benefits",
  label: "Scholar Benefits",
  kind: "roll",
  scope: "benefit",
  notation: "1d6",
  entries: [
    {
      id: "scholar-cash",
      label: "Grant Remainder",
      range: [1, 2],
      effects: [
        {
          id: "scholar-cash.effect",
          type: "credit.add",
          payload: { amount: 8000 },
        },
      ],
    },
    {
      id: "scholar-equipment",
      label: "Research Equipment",
      range: [3, 4],
      effects: [
        {
          id: "scholar-equipment.effect",
          type: "benefit.add",
          payload: { benefitType: "weapon", value: "scientific instrument kit" },
        },
      ],
    },
    {
      id: "scholar-passage",
      label: "Middle Passage",
      range: [5, 5],
      effects: [
        {
          id: "scholar-passage.effect",
          type: "benefit.add",
          payload: { benefitType: "middle-passage", amount: 1 },
        },
      ],
    },
    {
      id: "scholar-society",
      label: "Academic Society",
      range: [6, 6],
      effects: [
        {
          id: "scholar-society.effect",
          type: "relationship.add",
          payload: { relationshipType: "contact", label: "Academic society" },
        },
      ],
    },
  ],
},
{
  id: "entertainer.benefits",
  label: "Entertainer Benefits",
  kind: "roll",
  scope: "benefit",
  notation: "1d6",
  entries: [
    {
      id: "entertainer-cash",
      label: "Royalties",
      range: [1, 2],
      effects: [
        {
          id: "entertainer-cash.effect",
          type: "credit.add",
          payload: { amount: 10000 },
        },
      ],
    },
    {
      id: "entertainer-passage",
      label: "High Passage",
      range: [3, 4],
      effects: [
        {
          id: "entertainer-passage.effect",
          type: "benefit.add",
          payload: { benefitType: "high-passage", amount: 1 },
        },
      ],
    },
    {
      id: "entertainer-society",
      label: "Society Contact",
      range: [5, 5],
      effects: [
        {
          id: "entertainer-society.effect",
          type: "relationship.add",
          payload: { relationshipType: "contact", label: "Society host" },
        },
      ],
    },
    {
      id: "entertainer-patron-benefit",
      label: "Patron",
      range: [6, 6],
      effects: [
        {
          id: "entertainer-patron-benefit.effect",
          type: "relationship.add",
          payload: { relationshipType: "patron", label: "Media patron" },
        },
      ],
    },
  ],
},
{
  id: "navy.benefits",
  label: "Navy Benefits",
  kind: "roll",
  scope: "benefit",
  notation: "1d6",
  entries: [
    {
      id: "navy-cash",
      label: "Mustering Pay",
      range: [1, 2],
      effects: [
        {
          id: "navy-cash.effect",
          type: "credit.add",
          payload: { amount: 12000 },
        },
      ],
    },
    {
      id: "navy-weapon",
      label: "Service Weapon",
      range: [3, 4],
      effects: [
        {
          id: "navy-weapon.effect",
          type: "benefit.add",
          payload: { benefitType: "weapon", value: "service pistol" },
        },
      ],
    },
    {
      id: "navy-passage",
      label: "High Passage",
      range: [5, 5],
      effects: [
        {
          id: "navy-passage.effect",
          type: "benefit.add",
          payload: { benefitType: "high-passage", amount: 1 },
        },
      ],
    },
    {
      id: "navy-ship-share",
      label: "Ship Share",
      range: [6, 6],
      effects: [
        {
          id: "navy-ship-share.effect",
          type: "benefit.add",
          payload: { benefitType: "ship", value: "naval_prize_share" },
        },
      ],
    },
  ],
},
{
  id: "army.benefits",
  label: "Army Benefits",
  kind: "roll",
  scope: "benefit",
  notation: "1d6",
  entries: [
    {
      id: "army-cash",
      label: "Mustering Pay",
      range: [1, 2],
      effects: [
        {
          id: "army-cash.effect",
          type: "credit.add",
          payload: { amount: 10000 },
        },
      ],
    },
    {
      id: "army-weapon",
      label: "Service Weapon",
      range: [3, 4],
      effects: [
        {
          id: "army-weapon.effect",
          type: "benefit.add",
          payload: { benefitType: "weapon", value: "service rifle" },
        },
      ],
    },
    {
      id: "army-passage",
      label: "Middle Passage",
      range: [5, 5],
      effects: [
        {
          id: "army-passage.effect",
          type: "benefit.add",
          payload: { benefitType: "middle-passage", amount: 1 },
        },
      ],
    },
    {
      id: "army-society",
      label: "Veterans Society",
      range: [6, 6],
      effects: [
        {
          id: "army-society.effect",
          type: "benefit.add",
          payload: { benefitType: "society", value: "army veterans network" },
        },
      ],
    },
  ],
},
{
  id: "marines.benefits",
  label: "Marines Benefits",
  kind: "roll",
  scope: "benefit",
  notation: "1d6",
  entries: [
    {
      id: "marines-cash",
      label: "Mustering Pay",
      range: [1, 2],
      effects: [
        {
          id: "marines-cash.effect",
          type: "credit.add",
          payload: { amount: 9000 },
        },
      ],
    },
    {
      id: "marines-weapon",
      label: "Service Weapon",
      range: [3, 4],
      effects: [
        {
          id: "marines-weapon.effect",
          type: "benefit.add",
          payload: { benefitType: "weapon", value: "marine combat rifle" },
        },
      ],
    },
    {
      id: "marines-passage",
      label: "Middle Passage",
      range: [5, 5],
      effects: [
        {
          id: "marines-passage.effect",
          type: "benefit.add",
          payload: { benefitType: "middle-passage", amount: 1 },
        },
      ],
    },
    {
      id: "marines-contact-benefit",
      label: "Veteran Contact",
      range: [6, 6],
      effects: [
        {
          id: "marines-contact-benefit.effect",
          type: "relationship.add",
          payload: { relationshipType: "contact", label: "Marine veteran" },
        },
      ],
    },
  ],
},
{
  id: "survey-scout.benefits",
  label: "Survey Scout Benefits",
  kind: "roll",
  scope: "benefit",
  notation: "1d6",
  entries: [
    {
      id: "survey-scout.cash",
      label: "Survey Bonus",
      range: [1, 2],
      effects: [
        {
          id: "survey-scout.cash.effect",
          type: "credit.add",
          payload: { amount: 8000 },
        },
      ],
    },
    {
      id: "survey-scout.weapon",
      label: "Field Weapon",
      range: [3, 4],
      effects: [
        {
          id: "survey-scout.weapon.effect",
          type: "benefit.add",
          payload: { benefitType: "weapon", value: "field carbine" },
        },
      ],
    },
    {
      id: "survey-scout.high-passage",
      label: "High Passage",
      range: [5, 5],
      effects: [
        {
          id: "survey-scout.high-passage.effect",
          type: "benefit.add",
          payload: { benefitType: "high-passage", amount: 1 },
        },
      ],
    },
    {
      id: "survey-scout.ship",
      label: "Scout Ship Access",
      range: [6, 6],
      effects: [
        {
          id: "survey-scout.ship.effect",
          type: "benefit.add",
          payload: { benefitType: "ship", value: "scout" },
        },
      ],
    },
  ],
},
{
  id: "drifter.benefits",
  label: "Drifter Benefits",
  kind: "roll",
  scope: "benefit",
  notation: "1d6",
  entries: [
    {
      id: "drifter-cash",
      label: "Scraped Savings",
      range: [1, 4],
      effects: [
        {
          id: "drifter-cash.effect",
          type: "credit.add",
          payload: { amount: 2000 },
        },
      ],
    },
    {
      id: "drifter-low-passage",
      label: "Low Passage",
      range: [5, 6],
      effects: [
        {
          id: "drifter-low-passage.effect",
          type: "benefit.add",
          payload: { benefitType: "low-passage", amount: 1 },
        },
      ],
    },
  ],
},
] as const satisfies readonly LifepathTableDefinition[];
