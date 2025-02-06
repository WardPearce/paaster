export async function load({ locals }): Promise<{
  pastes: {
    paste: { id: string, key: string, nonce: string; },
    accessKey: { key: string, nonce: string; };
    created: Date;
  }[];
}> {
  if (!locals.userId) {
    return { pastes: [] };
  }

  let pastes = [];

  for await (
    let paste of locals.mongoDb.collection('userPastes').find({
      userId: locals.userId
    }).sort({ created: -1 })
  ) {
    pastes.push({ paste: paste.paste, accessKey: paste.accessKey, created: paste.created });
  }

  return { pastes: pastes };
}