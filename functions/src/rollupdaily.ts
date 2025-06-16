import { onSchedule } from "firebase-functions/v2/scheduler";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

/**
 * roll up yesterday's telemetry for every device
 * runs at 01:15 am est daily
 */
export const rollupdaily = onSchedule(
    {
      schedule: "15 1 * * *",
      timeZone: "America/New_York",
      memory: "512MiB",
    },
    async () => {
      const todayLocal = new Date();
      const midnightLocal = new Date(
          todayLocal.getFullYear(),
          todayLocal.getMonth(),
          todayLocal.getDate(),
      );
      const endUtc = new Date(midnightLocal.getTime() + midnightLocal.getTimezoneOffset() * 60000);
      const startUtc = new Date(endUtc.getTime() - 24 * 60 * 60 * 1000);
      const docId = startUtc.toISOString().substring(0, 10);

      const devices = await db.collection("devices").select().get();

      await Promise.all(
          devices.docs.map(async (dSnap) => {
            const deviceId = dSnap.id;

            const tele = await db
                .collection("devices")
                .doc(deviceId)
                .collection("telemetry")
                .where("ts", ">=", admin.firestore.Timestamp.fromDate(startUtc))
                .where("ts", "<", admin.firestore.Timestamp.fromDate(endUtc))
                .select("amp", "gasPpm", "status")
                .get();

            if (tele.empty) return;

            let ampSum = 0;
            let gasSum = 0;
            let onMinutes = 0;

            tele.forEach((t) => {
              const {amp, gasPpm, status} = t.data() as {
            amp: number;
            gasPpm: number;
            status: string;
          };
              ampSum += amp;
              gasSum += gasPpm;
              if (status === "running") onMinutes += 10 / 60;
            });

            const n = tele.size;
            await db
                .collection("devices")
                .doc(deviceId)
                .collection("daily")
                .doc(docId)
                .set(
                    {
                      date: docId,
                      ampAvg: ampSum / n,
                      gasAvg: gasSum / n,
                      runTimeMin: Math.round(onMinutes),
                      sampleCount: n,
                      computedAt: admin.firestore.FieldValue.serverTimestamp(),
                    },
                    {merge: true},
                );
          }),
      );

      console.log(`Daily roll-up complete for ${docId}`);
    },
);
