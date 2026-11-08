import { Router } from 'express';
import * as kudosController from '../controllers/kudos.controller.js';
import * as usersController from '../controllers/users.controller.js';
import { users } from '../store.js';

export const api = Router();

// Spec endpoints
api.get('/users', usersController.listUsers); //                    §2.2.1
api.post('/kudos', kudosController.createKudos); //                 §2.2.2
api.get('/kudos', kudosController.listKudos); //                    §2.2.3
api.patch('/kudos/:id/moderate', kudosController.moderateKudos); // §2.2.4

// Demo-only helper (NOT part of the spec): the frontend user switcher needs a
// list of all identities, since /api/users deliberately excludes the requester.
api.get('/dev/users', (req, res) => {
  res.json({
    users: users
      .filter((u) => u.is_active)
      .map((u) => ({ id: u.id, name: u.name, is_admin: u.is_admin })),
  });
});
