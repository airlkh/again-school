const admin = require('firebase-admin');

const serviceAccount = {
  type: 'service_account',
  project_id: 'again-school-bfea8',
  private_key_id: '77c6cef68849da5531a9deadc9e1ad1acb0e958e',
  private_key: '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCWqTi3Vy/eT1+w\nileEdTR4YzE32ZTWJQo4jhI+bELu6fCVdGA3AkNfG1xaq1OlNmgu5mWx8+yw/Vnq\n2nOq/OF82PSJ38j3K/DGgWek8ohGjk/vAxeNKyjB67rrQ/7mkkb+Ih96A8vAoc40\nSu9jHr3txKXh5k0P49wW1tjzNx6cvK+QlsOah0hMF+uBUZC1ZVxphBYJ+meDKuvm\nhGgIfilnWBwhVY9eDM7gQmHgXpdB+3gd2e7r/CCEpMxEvDS4wAcBuGfuMn3Amdua\nV8Fa3gqEpc1DKb2wlRFEArLHgRQJzuxUgU7lmLbfpJyCGelM0K4+QWXAV9oY+J5y\n0tfeTwsxAgMBAAECggEACe4e6HSqbskar0CQX/u3/jcEKOB3idLN/5LGUI94V5Yb\nREUz90Q4ARDaWjk1zZX5BshVoRrzpD8apLBf1IAPnlflbEtP9rynxXRaNWTCnICS\nSQMSPmd/Fk2tglwMX7xPShOhMVIGkAyKJ70IVhHnZlXNB4c+Ao4Gn7Rq/xgzCr+0\nyzv4sKQoEYFAZsxVY/QAd1aOdIem44rOG54X8G5jo+67430SUqaYJoZ0FPA3QPB2\nTJaWo/csL5fa7P0Rcju+jw0UtcKIsbG4NmBW4QY6jveXX95qmxG5UdIdr+PcvvQg\nwHhWaPp5QDqZY7YKQHUKf82hW0oe6QpWgDBJoxULXQKBgQDGAqnKMnYh+Uag7Syv\nQ5nXZLqb5oR/FTN0t9l+VBs6VCeU/GMFOjrJU4t0tf77cH9jN2Ydf2pe9JPJW0Iv\nuGhfHB3fCCynRrkfcBBctcHAMzP4LvOp2xbIQpVAXl1zONH4X1nnS+SuoaxdRMRi\nwnA3fHd/RNbtoQ1roH61WxRjHQKBgQDCyKgHZCyqdcPRq5WRFsKwYCXHnMtZIA5p\ndkwTYZp8UaM54lnLmYfN1+fgvbkfOWhpSmE8HNgnZ1vd6k1A71eBU9fRq6gzrS6H\n4Lzj/SCfImyAwI+tgQLkZ9OPXHz1BynsQx8f5AxVUuyAJ+YvBWnOPwretWqteFf1\nCo3UaLoYJQKBgDqQ3xdnBXnW+QTwIZ9VJ1OF/4vNCrNr2eRT3Ih45/TAn1R5sfAB\n4RFbHIxQqDJGe+cko5dl8FhVjsCntVPX/0biUhN9n3d6e5bI1o4VVFE808o8WOWM\nX5ir2OlI/+rsi24jBbxbvi/IseqERHHRgM9oiQ+jlM6ELCwBNHj/j3AhAoGBAI/J\nA5CBOB+U0zphiQUTYiBEuV7CtbFS4pCjTME52YpP0UgXeOW8re0bpgXWx2LvQ84F\npAV13XIo8D2+icyXYWcMd1JFfuK2wpR3J7i80GnoRWQ9wVH43COzKQ643V0bLq1D\nVyR5eUk6724jBd5MBrDDBMkl7lujbHpskgnsTQMpAoGBAJi4FJQ6MIqxeD9Xx8m2\nFV6KBj1qjpu+Cg7KcI25njd/D0tk5NIT9pGuOJ52JfbSZ/isnmBYaqX+9L6DMbm8\nyycyVTXrSoKkkOljVd9G2OX+zhcB5HZWR8jZgIH+kiBTgpaG2Ifmk7DSXSjqASyR\nbETKC3bVuMbzPB+djZAFt/80\n-----END PRIVATE KEY-----\n',
  client_email: 'firebase-adminsdk-fbsvc@again-school-bfea8.iam.gserviceaccount.com',
  client_id: '113478046507748863668',
  auth_uri: 'https://accounts.google.com/o/oauth2/auth',
  token_uri: 'https://oauth2.googleapis.com/token',
  auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
  client_x509_cert_url: 'https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40again-school-bfea8.iam.gserviceaccount.com',
};

admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
const db = admin.firestore();

async function migrate() {
  const postsSnap = await db.collection('posts').get();
  let updated = 0;
  let skipped = 0;

  for (const postDoc of postsSnap.docs) {
    const data = postDoc.data();

    // schoolName 이미 있으면 스킵
    if (data.schoolName) { skipped++; continue; }

    // authorUid로 users 문서에서 schoolName 가져오기
    if (!data.authorUid) { skipped++; continue; }

    try {
      const userDoc = await db.collection('users').doc(data.authorUid).get();
      if (!userDoc.exists) { skipped++; continue; }

      const userData = userDoc.data();
      const schoolName = userData.schoolNames?.[0] || userData.schools?.[0]?.schoolName || '';

      if (schoolName) {
        await postDoc.ref.update({ schoolName });
        console.log(`✅ 업데이트: ${postDoc.id} → ${schoolName}`);
        updated++;
      } else {
        skipped++;
      }
    } catch (e) {
      console.warn(`⚠️ 실패: ${postDoc.id}`, e.message);
    }
  }

  console.log(`\n완료! 업데이트: ${updated}건, 스킵: ${skipped}건`);
}

migrate().catch(console.error);
