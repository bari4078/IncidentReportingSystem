const oracledb = require('oracledb');
async function test() {
    try {
        const conn = await oracledb.getConnection({
            user: 'IncidentDba',
            password: '123',
            connectString: 'localhost:1521/XE'
        });
        const res = await conn.execute("SELECT u.user_id, u.email, u.role FROM USERS u WHERE u.role = 'Responder'");
        console.log("Responders:", res.rows);
        const res2 = await conn.execute("SELECT * FROM INCIDENTS");
        console.log("Incidents:", res2.rows);
        await conn.close();
    } catch(e) {
        console.error(e);
    }
}
test();
