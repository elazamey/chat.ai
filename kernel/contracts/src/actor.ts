/** من قام بالفعل. الـKernel نفسه Actor من نوع system. */
export interface Actor {
  type: 'user' | 'system' | 'agent' | 'tool';
  id: string;
}

export const systemActor: Actor = { type: 'system', id: 'kernel' };

export function actorUser(id: string): Actor {
  return { type: 'user', id };
}

export function actorAgent(id: string): Actor {
  return { type: 'agent', id };
}

export function actorTool(id: string): Actor {
  return { type: 'tool', id };
}
