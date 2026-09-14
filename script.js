const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRgxqcHMwAtkXobgFNTggz-X0l-EwfshtsG9mYOWHv8aOEARnYpCwz8cvgdATDFU83or-q9q6wzgzEc/pub?output=csv';

// Interval automatického obnovení v milisekundách (30000 ms = 30 sekund)
const REFRESH_INTERVAL = 30000;

let nactenaData = [];
let seznamAkci = [];
let seznamZakum = [];

function nactiData() {
  Papa.parse(CSV_URL, {
    download: true,
    header: true,
    skipEmptyLines: true,
    complete: function(results) {
      if (!results.data || results.data.length === 0) return;

      nactenaData = results.data;
      
      const vsechnySloupce = Object.keys(nactenaData[0]);
      seznamAkci = vsechnySloupce.slice(1);

      seznamZakum = nactenaData
        .map(row => row[vsechnySloupce[0]]?.trim())
        .filter(jmeno => jmeno);

      naplnRoletkyVylepsene();
      zmenFiltr();
    },
    error: function(err) {
      document.getElementById('dluznici-list').innerHTML = '<li>Chyba: Nepodařilo se navázat spojení s databází CSV!</li>';
    }
  });
}

// Funkce naplní roletky a zachová uživatelem vybranou hodnotu i při automatickém obnovení
function naplnRoletkyVylepsene() {
  const selectAkce = document.getElementById('akce-select');
  const selectZaci = document.getElementById('zaci-select');

  const ulozenaAkce = selectAkce.value;
  const ulozenyZak = selectZaci.value;

  selectAkce.innerHTML = '<option value="vse">-- VŠE ANOHO / VŠECHNY AKCE --</option>';
  seznamAkci.forEach((akce, index) => {
    const option = document.createElement('option');
    option.value = index;
    option.textContent = akce.toUpperCase();
    selectAkce.appendChild(option);
  });
  if (ulozenaAkce !== "") selectAkce.value = ulozenaAkce;

  selectZaci.innerHTML = '<option value="vse">-- VŠICHNI ŽÁCI --</option>';
  seznamZakum.forEach((zak, index) => {
    const option = document.createElement('option');
    option.value = index;
    option.textContent = zak.toUpperCase();
    selectZaci.appendChild(option);
  });
  if (ulozenyZak !== "") selectZaci.value = ulozenyZak;
}

function zmenFiltr() {
  vyhodnotDluzniky();
  zobrazTabulku();
}

function vyhodnotDluzniky() {
  const valAkce = document.getElementById('akce-select').value;
  const valZak = document.getElementById('zaci-select').value;
  const list = document.getElementById('dluznici-list');
  const nadpis = document.getElementById('nadpis-dluznici');
  
  list.innerHTML = '';
  let pocetDluzniku = 0;

  // 1. PŘÍPAD: Vybrán konkrétní žák
  if (valZak !== 'vse' && valZak !== '') {
    const vybranyZak = seznamZakum[valZak];
    const radekZaka = nactenaData.find(row => row[Object.keys(row)[0]]?.trim() === vybranyZak);

    nadpis.textContent = `STAV PLATBÍ ŽÁKA: ${vybranyZak ? vybranyZak.toUpperCase() : ''}`;

    if (radekZaka) {
      seznamAkci.forEach(akce => {
        if (valAkce !== 'vse' && valAkce !== '' && seznamAkci[valAkce] !== akce) return;

        const stav = radekZaka[akce]?.trim().toLowerCase();
        const li = document.createElement('li');

        if (stav === '1' || stav === 'ano' || stav === 'zaplaceno' || stav === 'ok') {
          li.innerHTML = `AKCE: <b>${akce.toUpperCase()}</b> — <font color="#008000"><b>ZAPLACENO (OK)</b></font>`;
        } else if (stav === '-' || stav === 'neúčast' || stav === 'neucast') {
          li.innerHTML = `AKCE: <b>${akce.toUpperCase()}</b> — <font color="#808080"><b>NEÚČASTNÍ SE (NENÍ DLUH)</b></font>`;
        } else {
          pocetDluzniku++;
          li.innerHTML = `AKCE: <b>${akce.toUpperCase()}</b> — <font color="#FF0000"><b>NEZAPLACENO (DLUH)</b></font>`;
        }
        list.appendChild(li);
      });
    }

    if (pocetDluzniku === 0 && (valAkce === 'vse' || valAkce === '')) {
      list.innerHTML = '<li><font color="#008000"><b>TENTO ŽÁK MÁ VŠECHNY AKCE ŘÁDNĚ UHRAZENY NEBO OMLOVENY!</b></font></li>';
    }

  // 2. PŘÍPAD: Všichni žáci + konkrétní nebo všechny akce
  } else {
    if (valAkce === 'vse' || valAkce === '') {
      nadpis.textContent = 'SEZNAM ŽÁKŮ S JAKÝMKOLIV NEDOPLATKEM:';
      
      nactenaData.forEach(row => {
        const jmeno = row[Object.keys(row)[0]]?.trim();
        if (!jmeno) return;

        let nezaplaceneAkce = [];
        seznamAkci.forEach(akce => {
          const stav = row[akce]?.trim().toLowerCase();
          const jeZaplaceno = stav === '1' || stav === 'ano' || stav === 'zaplaceno' || stav === 'ok';
          const jeNeucast = stav === '-' || stav === 'neúčast' || stav === 'neucast';

          if (!jeZaplaceno && !jeNeucast) {
            nezaplaceneAkce.push(akce);
          }
        });

        if (nezaplaceneAkce.length > 0) {
          pocetDluzniku++;
          const li = document.createElement('li');
          li.innerHTML = `<b>${jmeno.toUpperCase()}</b> — <font color="#FF0000">CHYBÍ:</font> ${nezaplaceneAkce.join(', ')}`;
          list.appendChild(li);
        }
      });

    } else {
      const vybranaAkce = seznamAkci[valAkce];
      nadpis.textContent = `SEZNAM ŽÁKŮ, KTEŘÍ NEZAPLATILI AKCI: ${vybranaAkce ? vybranaAkce.toUpperCase() : ''}`;

      nactenaData.forEach(row => {
        const jmeno = row[Object.keys(row)[0]]?.trim();
        if (!jmeno) return;

        const stav = row[vybranaAkce]?.trim().toLowerCase();
        const jeZaplaceno = stav === '1' || stav === 'ano' || stav === 'zaplaceno' || stav === 'ok';
        const jeNeucast = stav === '-' || stav === 'neúčast' || stav === 'neucast';

        if (!jeZaplaceno && !jeNeucast) {
          pocetDluzniku++;
          const li = document.createElement('li');
          li.innerHTML = `<b>${jmeno.toUpperCase()}</b> — <font color="#FF0000">DLUH PLNĚ TRVÁ</font>`;
          list.appendChild(li);
        }
      });
    }

    if (pocetDluzniku === 0) {
      list.innerHTML = '<li><font color="#008000"><b>VŠICHNI ŽÁCI MAJÍ VŠECHNO ŘÁDNĚ ZAPLACENO NEBO OMLOVENO! VÝBORNĚ! 🎉</b></font></li>';
    }
  }
}

function zobrazTabulku() {
  const valAkce = document.getElementById('akce-select').value;
  const valZak = document.getElementById('zaci-select').value;
  const thead = document.getElementById('tabulka-hlavicka');
  const tbody = document.getElementById('tabulka-telo');

  thead.innerHTML = '';
  tbody.innerHTML = '';

  let zobrazovanaData = nactenaData;
  if (valZak !== 'vse' && valZak !== '') {
    const vybranyZak = seznamZakum[valZak];
    zobrazovanaData = nactenaData.filter(row => row[Object.keys(row)[0]]?.trim() === vybranyZak);
  }

  function formatujStav(stav) {
    const s = stav?.trim().toLowerCase();
    if (s === '1' || s === 'ano' || s === 'zaplaceno' || s === 'ok') {
      return '<font color="#008000"><b>ANO</b></font>';
    } else if (s === '-' || s === 'neúčast' || s === 'neucast') {
      return '<font color="#808080"><b>—</b></font>';
    } else {
      return '<font color="#FF0000"><b>NE</b></font>';
    }
  }

  if (valAkce === 'vse' || valAkce === '') {
    let headHtml = '<tr><th align="left">JMÉNO ŽÁKA</th>';
    seznamAkci.forEach(akce => headHtml += `<th align="center">${akce.toUpperCase()}</th>`);
    headHtml += '</tr>';
    thead.innerHTML = headHtml;

    zobrazovanaData.forEach(row => {
      const jmeno = row[Object.keys(row)[0]]?.trim();
      if (!jmeno) return;

      let bodyHtml = `<tr><td><b>${jmeno}</b></td>`;
      seznamAkci.forEach(akce => {
        bodyHtml += `<td align="center">${formatujStav(row[akce])}</td>`;
      });
      bodyHtml += '</tr>';
      tbody.innerHTML += bodyHtml;
    });

  } else {
    const vybranaAkce = seznamAkci[valAkce];
    thead.innerHTML = `<tr><th align="left">JMÉNO ŽÁKA</th><th align="center">STAV PLATBY (${vybranaAkce ? vybranaAkce.toUpperCase() : ''})</th></tr>`;

    zobrazovanaData.forEach(row => {
      const jmeno = row[Object.keys(row)[0]]?.trim();
      if (!jmeno) return;

      tbody.innerHTML += `
        <tr>
          <td><b>${jmeno}</b></td>
          <td align="center">${formatujStav(row[vybranaAkce])}</td>
        </tr>
      `;
    });
  } // Rapha <3 Lukas
}

// První spuštění načtení dat
nactiData();

// Nastavení automatického obnovování dat každých 30 sekund
setInterval(nactiData, REFRESH_INTERVAL);