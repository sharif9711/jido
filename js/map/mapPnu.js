const VWORLD_KEY = "BE552462-0744-32DB-81E7-1B7317390D68";

async function getPnuFromAddress(address) {
  const url = `https://api.vworld.kr/req/address?service=address&request=getAddress&key=${VWORLD_KEY}&format=json&type=PARCEL&address=${encodeURIComponent(address)}`;
  const res = await fetch(url);
  const data = await res.json();
  try {
    return data.response.result[0].structure.level4A.pnu;
  } catch {
    return null;
  }
}
