import { KJUR } from 'jsrsasign';
import CryptoJS from 'crypto-js';

/**
 * A sample function to generate a token to join a video SDK session
 * In a production app, this should be generated by the server -- never the frontend -- 
 * as it is very insecure
 * 
 * @param sdkKey your video SDK key
 * @param sdkSecret your video SDK secret
 * @param topic your session topic
 * @param passWord your session password
 */
// eslint-disable-next-line import/prefer-default-export
export function generateSessionToken(
 {  sdkKey = "",
 sdkSecret = "",
 passWord = '',
 sessionId = '',
 userIdentity = 'irfan',
 roleType = 0,}
) {
  let signature = '';
  try {
    const iat = Math.round(new Date().getTime() / 1000);
    const exp = iat + 60 * 60 * 2;

    // Header
    const oHeader = { alg: 'HS256', typ: 'JWT' };
    // Payload
    const oPayload = {
      app_key: sdkKey,
      iat,
      exp,
      tpc: sessionId,
      pwd: passWord,
      user_identity: userIdentity,
      cloud_recording_option: 0,
      cloud_recording_election: 0,
      session_key: sessionId,
      role_type: roleType,  // ==> value 1 for host and value 0 is for attendee
    };
    const sHeader = JSON.stringify(oHeader);
    const sPayload = JSON.stringify(oPayload);
    signature = KJUR.jws.JWS.sign('HS256', sHeader, sPayload, sdkSecret);
  } catch (e) {
    console.error(e);
  }
  return signature;
}
