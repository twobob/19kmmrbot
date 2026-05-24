const http = require('http');

const payload = {
  auth: "itstwobob",
  block: [
    {
      data: [
        {
          public_player_state: {
            account_id: 12345678,
            persona_name: "itstwobob TTV",
            health: 100,
            gold: 30,
            level: 8,
            rank_tier: 73, // Big Boss 4
            global_leaderboard_rank: null,
            units: [
              { entindex: 101, unit_id: 24, position: { x: 2, y: 3 }, rank: 2 }, // 2-star Luna (takes 3 copies)
              { entindex: 102, unit_id: 21, position: { x: 3, y: 3 }, rank: 1 }  // 1-star Chaos Knight (takes 1 copy)
            ],
            item_slots: []
          }
        },
        {
          public_player_state: {
            account_id: 87654321,
            persona_name: "fosterul",
            health: 80,
            gold: 45,
            level: 9,
            rank_tier: 80, // Lord of White Spire
            global_leaderboard_rank: 25,
            units: [
              { entindex: 201, unit_id: 24, position: { x: 1, y: 1 }, rank: 1 }, // 1-star Luna (takes 1 copy)
              { entindex: 202, unit_id: 1, position: { x: 2, y: 2 }, rank: 2 }   // 2-star Axe (takes 3 copies)
            ],
            item_slots: []
          }
        },
        {
          public_player_state: {
            account_id: 11111111,
            persona_name: "PlayerThree",
            health: 90,
            gold: 50,
            level: 8,
            rank_tier: 70, // Big Boss 1
            global_leaderboard_rank: null,
            units: [
              { entindex: 301, unit_id: 24, position: { x: 4, y: 4 }, rank: 1 }  // 1-star Luna (takes 1 copy)
            ],
            item_slots: []
          }
        },
        {
          public_player_state: {
            account_id: 22222222,
            persona_name: "PlayerFour",
            health: 85,
            gold: 40,
            level: 8,
            rank_tier: 71, // Big Boss 2
            global_leaderboard_rank: null,
            units: [],
            item_slots: []
          }
        },
        {
          public_player_state: {
            account_id: 33333333,
            persona_name: "PlayerFive",
            health: 75,
            gold: 35,
            level: 8,
            rank_tier: 72, // Big Boss 3
            global_leaderboard_rank: null,
            units: [],
            item_slots: []
          }
        },
        {
          public_player_state: {
            account_id: 44444444,
            persona_name: "PlayerSix",
            health: 70,
            gold: 25,
            level: 8,
            rank_tier: 73, // Big Boss 4
            global_leaderboard_rank: null,
            units: [],
            item_slots: []
          }
        },
        {
          public_player_state: {
            account_id: 55555555,
            persona_name: "PlayerSeven",
            health: 65,
            gold: 20,
            level: 8,
            rank_tier: 74, // Big Boss 5
            global_leaderboard_rank: null,
            units: [],
            item_slots: []
          }
        },
        {
          public_player_state: {
            account_id: 66666666,
            persona_name: "PlayerEight",
            health: 50,
            gold: 10,
            level: 7,
            rank_tier: 65, // Lieutenant 5
            global_leaderboard_rank: null,
            units: [],
            item_slots: []
          }
        }
      ]
    }
  ]
};

const data = JSON.stringify(payload);

const options = {
  hostname: 'localhost',
  port: 6666,
  path: '/gsi',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  console.log(`Status Code: ${res.statusCode}`);
  res.on('data', (d) => {
    process.stdout.write(d);
  });
});

req.on('error', (error) => {
  console.error('Error sending GSI POST:', error);
});

req.write(data);
req.end();
console.log('Sending mock GSI full lobby payload to http://localhost:6666/gsi ...');
