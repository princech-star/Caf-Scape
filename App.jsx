import React, { useEffect, useMemo, useState } from "react";
import {
  Search, MapPin, Clock3, Users, Wifi, Snowflake, Coffee, Heart, Star,
  Bell, ShieldCheck, Camera, CalendarDays, Menu, X, LogIn, LogOut,
  ChevronRight, Plus, CheckCircle2, CircleAlert, Eye, EyeOff, LayoutDashboard,
  Store, ClipboardList, Settings, Upload, SlidersHorizontal
} from "lucide-react";
import { supabase, isDemo } from "./supabase";

const starterCafes = [
  { id:"c1", name:"The Fern & Filter", area:"Sector 15, Gurugram", mood:"Calm · Greenery", price:"₹₹", rating:4.7, reviews:128, crowd:"Quiet", seats:12, total:24, hours:"9:00 AM – 10:00 PM", desc:"A leafy hideaway for slow mornings, good coffee and focused work.", tags:["Wi-Fi","Charging","AC","Outdoor seating"], menu:[["Pour-over coffee","₹180"],["Iced vanilla latte","₹220"],["Avocado toast","₹290"]], image:"https://images.unsplash.com/photo-1445116572660-236099ec97a0?w=1200" },
  { id:"c2", name:"Common Grounds", area:"DLF Phase 3, Gurugram", mood:"Lively · Social", price:"₹₹₹", rating:4.5, reviews:86, crowd:"Busy", seats:5, total:30, hours:"8:00 AM – 11:00 PM", desc:"A bright neighbourhood café for conversations and weekend catch-ups.", tags:["Wi-Fi","AC","Parking"], menu:[["Cappuccino","₹190"],["Hazelnut brownie","₹160"],["Pesto sandwich","₹260"]], image:"https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1200" },
  { id:"c3", name:"Little Window Café", area:"Golf Course Road, Gurugram", mood:"Cozy · Artsy", price:"₹₹", rating:4.8, reviews:204, crowd:"Moderate", seats:8, total:18, hours:"10:00 AM – 9:30 PM", desc:"An intimate café with warm corners, house bakes and mellow music.", tags:["Wi-Fi","Charging","Outdoor seating"], menu:[["Flat white","₹200"],["Blueberry cheesecake","₹240"],["Mushroom toast","₹280"]], image:"https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=1200" }
];

function App() {
  const [cafes, setCafes] = useState(starterCafes);
  const [page, setPage] = useState("discover");
  const [activeCafe, setActiveCafe] = useState(starterCafes[0]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [saved, setSaved] = useState(["c3"]);
  const [notice, setNotice] = useState("");
  const [modal, setModal] = useState("");
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [managerEmail, setManagerEmail] = useState("");
  const [managerTempPassword, setManagerTempPassword] = useState("");
  const [booking, setBooking] = useState({ date:"", time:"", duration:"1 hour", seats:2 });
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [review, setReview] = useState("");
  const [reviewStars, setReviewStars] = useState(5);
  const [activity, setActivity] = useState(["Demo workspace ready. Sample café data is not live."]);

  const flash = (message) => { setNotice(message); window.setTimeout(() => setNotice(""), 3500); };
  const visibleCafes = useMemo(() => cafes.filter(c =>
    (c.name + " " + c.area + " " + c.mood).toLowerCase().includes(query.toLowerCase()) &&
    (filter === "All" || c.crowd === filter)
  ), [cafes, query, filter]);

  useEffect(() => {
    if (!supabase || isDemo) return;
    supabase.auth.getUser().then(({ data }) => setUser(data.user || null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user || null));
    return () => listener.subscription.unsubscribe();
  }, []);

  const updateCafe = (patch) => {
    setCafes(prev => prev.map(c => c.id === activeCafe.id ? { ...c, ...patch } : c));
    setActiveCafe(prev => ({ ...prev, ...patch }));
    setActivity(prev => [`${new Date().toLocaleString()}: ${Object.keys(patch).join(", ")} updated (demo)`, ...prev]);
    flash("Saved in demo mode. Connect Supabase to persist changes.");
  };

  async function sendOtp(e) {
    e.preventDefault();
    if (!email.trim()) return;
    if (isDemo) { setOtpSent(true); flash("Demo OTP: use 123456"); return; }
    const { error } = await supabase.auth.signInWithOtp({ email, options:{ shouldCreateUser:true } });
    if (error) flash(error.message); else { setOtpSent(true); flash("Check your email for the verification code."); }
  }
  async function verifyOtp(e) {
    e.preventDefault();
    if (isDemo) {
      if (otp !== "123456") return flash("For demo, enter 123456.");
      setUser({ email, demo:true }); setModal(""); flash("Signed in with demo customer account."); return;
    }
    const { error } = await supabase.auth.verifyOtp({ email, token:otp, type:"email" });
    if (error) flash(error.message); else setModal("");
  }
  async function signOut() {
    if (supabase && !isDemo) await supabase.auth.signOut();
    setUser(null); setPage("discover"); flash("Signed out.");
  }
  function reserveSeat(e) {
    e.preventDefault();
    if (!user) return setModal("login");
    if (!booking.date || !booking.time) return flash("Choose a date and time first.");
    flash("Demo booking created. No payment was taken.");
    setActivity(prev => [`Demo booking request: ${activeCafe.name}, ${booking.date} ${booking.time}`, ...prev]);
    setModal("");
  }
  function addReview(e) {
    e.preventDefault();
    if (!user) return setModal("login");
    if (!review.trim()) return;
    flash("Review submitted in demo mode for moderation.");
    setReview(""); setModal("");
  }
  function uploadPhoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSelectedPhoto(URL.createObjectURL(file));
    flash("Photo preview loaded. Real uploads require a configured Supabase Storage bucket.");
  }

  const openCafe = cafe => { setActiveCafe(cafe); setPage("cafe"); };
  const roleLabel = page === "admin" ? "Admin workspace" : "Café workspace";

  return <div className="app-shell">
    <header className="topbar">
      <button className="brand" onClick={() => setPage("discover")}><span className="brand-mark"><Coffee size={21}/></span><span>Café<span className="brand-light">Scape</span><small>FIND YOUR CORNER</small></span></button>
      <nav className="desktop-nav">
        <button className={page==="discover"?"active":""} onClick={()=>setPage("discover")}>Discover</button>
        <button className={page==="saved"?"active":""} onClick={()=>setPage("saved")}>Saved cafés</button>
        <button className={page==="dashboard"?"active":""} onClick={()=>setPage("dashboard")}>Café portal</button>
      </nav>
      <div className="top-actions">
        <span className="demo-pill">{isDemo ? "DEMO MODE" : "LIVE MODE"}</span>
        {user ? <button className="user-chip" onClick={signOut}><span className="avatar">{(user.email||"U")[0].toUpperCase()}</span><span className="hide-mobile">{user.email}</span><LogOut size={15}/></button> : <button className="button button-dark button-small" onClick={()=>setModal("login")}><LogIn size={15}/> Sign in</button>}
      </div>
    </header>

    {page === "discover" && <>
      <section className="hero">
        <div className="hero-copy"><div className="eyebrow"><span/> YOUR NEXT FAVOURITE CORNER</div><h1>Find a café that<br/><em>feels like you.</em></h1><p>Discover welcoming spaces, check the reported crowd and reserve your seat before you arrive.</p>
          <div className="searchbar"><Search size={19}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search cafés, areas or moods..."/><button onClick={()=>setQuery("")}>Clear</button></div>
          <div className="hero-foot"><span><MapPin size={14}/> Gurugram, Haryana · Demo location</span><span>Curated spaces, considered moments.</span></div>
        </div>
        <div className="hero-image"><img src="https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1400" alt="Coffee on a café table"/><div className="image-note"><span className="note-icon"><Coffee size={18}/></span><span><b>Your kind of place</b><small>Good coffee. Better corners.</small></span></div></div>
      </section>
      <main className="content">
        <div className="section-head"><div><div className="eyebrow">EXPLORE YOUR NEIGHBOURHOOD</div><h2>Cafés worth slowing down for</h2><p className="muted">Browse the vibe, check seat estimates and plan your visit.</p></div><div className="filters"><SlidersHorizontal size={16}/>{["All","Quiet","Moderate","Busy","Very Busy"].map(f=><button key={f} className={filter===f?"selected":""} onClick={()=>setFilter(f)}>{f}</button>)}</div></div>
        <div className="cafe-grid">{visibleCafes.map(c=><CafeCard key={c.id} cafe={c} saved={saved.includes(c.id)} onSave={()=>setSaved(s=>s.includes(c.id)?s.filter(x=>x!==c.id):[...s,c.id])} onOpen={()=>openCafe(c)}/>)}</div>
        {!visibleCafes.length && <div className="empty"><Coffee/><h3>No cafés found</h3><p>Try a different search or crowd filter.</p></div>}
        <div className="trust-strip"><ShieldCheck/><div><b>Useful, transparent updates</b><span>Crowd levels are estimates reported by café staff, not automatic occupancy tracking.</span></div></div>
      </main>
    </>}

    {page === "saved" && <main className="content page-content"><div className="eyebrow">YOUR SHORTLIST</div><h2>Saved cafés</h2><div className="cafe-grid">{cafes.filter(c=>saved.includes(c.id)).map(c=><CafeCard key={c.id} cafe={c} saved onSave={()=>setSaved(s=>s.filter(x=>x!==c.id))} onOpen={()=>openCafe(c)}/>)}</div>{!saved.length&&<p className="muted">Save a café to find it here later.</p>}</main>}

    {page === "cafe" && <main className="content page-content">
      <button className="back-link" onClick={()=>setPage("discover")}>← Back to discovery</button>
      <div className="detail-hero"><img src={activeCafe.image} alt={activeCafe.name}/><div className="detail-overlay"><span className="verified"><ShieldCheck size={14}/> Demo profile</span><h1>{activeCafe.name}</h1><p><MapPin size={15}/> {activeCafe.area}</p></div></div>
      <div className="detail-layout"><div className="detail-main">
        <div className="detail-title"><div><div className="eyebrow">THE CAFÉ STORY</div><h2>{activeCafe.mood}</h2></div><div className="rating"><Star size={17} fill="currentColor"/> {activeCafe.rating} <span>({activeCafe.reviews} reviews)</span></div></div>
        <p className="description">{activeCafe.desc}</p>
        <h3>Menu highlights</h3><div className="menu-list">{activeCafe.menu.map((m,i)=><div key={i}><span>{m[0]}</span><b>{m[1]}</b></div>)}</div>
        <h3>What you'll find</h3><div className="tag-list">{activeCafe.tags.map(t=><span key={t}>{t}</span>)}</div>
        <h3>Reviews from the community</h3><div className="review-card"><div className="review-top"><b>Recent visitor</b><span>★★★★★</span></div><p>“A lovely place to take a break. The atmosphere made the visit.”</p><small>Sample community review · Demo content</small></div><button className="button button-outline" onClick={()=>setModal("review")}>Write a review</button>
      </div><aside className="booking-card"><div className="eyebrow">PLAN YOUR VISIT</div><h3>Make it your moment</h3><div className="crowd-box"><div><span className={`crowd-dot ${activeCafe.crowd.toLowerCase().replace(" ","-")}`}/><b>{activeCafe.crowd}</b></div><strong>{activeCafe.seats} <small>estimated seats available</small></strong><p>Owner-reported estimate · Demo data</p></div><div className="info-row"><Clock3/><span><b>Opening hours</b><small>{activeCafe.hours}</small></span></div><div className="info-row"><MapPin/><span><b>Location</b><small>{activeCafe.area}</small></span></div><div className="info-row"><Users/><span><b>Capacity estimate</b><small>{activeCafe.seats} of {activeCafe.total} seats reported vacant</small></span></div><button className="button button-dark full" onClick={()=>setModal("booking")}> <CalendarDays size={17}/> Reserve a seat</button><small className="fine-print">Demo only: no real booking or payment is processed.</small></aside></div>
    </main>}

    {page === "dashboard" && <main className="content page-content">
      <div className="dashboard-heading"><div><div className="eyebrow">CAFÉSCAPE BUSINESS</div><h2>{roleLabel}</h2><p className="muted">Manage café information and customer-facing updates.</p></div><span className="demo-pill">SAMPLE WORKSPACE</span></div>
      <div className="dashboard-layout"><aside className="dash-side"><button className="dash-active"><LayoutDashboard/> Overview</button><button onClick={()=>flash("Profile editor is available in the overview form.")}><Store/> Café profile</button><button onClick={()=>flash("Photo upload preview is available below.")}><Camera/> Photos & menu</button><button onClick={()=>flash("Bookings are demo-only in this starter.")}><ClipboardList/> Bookings</button><button onClick={()=>setPage("admin")}><ShieldCheck/> Admin review</button></aside>
      <section className="dash-main"><div className="stats-row"><Stat label="Café locations" value="03" icon={<Store/>}/><Stat label="Bookings today" value="12" icon={<CalendarDays/>}/><Stat label="Profile views" value="248" icon={<Users/>}/></div>
        <div className="panel"><div className="panel-head"><div><h3>Location settings</h3><p>Edit the customer-facing café information.</p></div><span className="status-tag">DEMO EDITOR</span></div>
          <label className="field-label">Choose café</label><select value={activeCafe.id} onChange={e=>setActiveCafe(cafes.find(c=>c.id===e.target.value))}>{cafes.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
          <div className="form-grid"><Field label="Café name" value={activeCafe.name} onChange={v=>updateCafe({name:v})}/><Field label="Area / address" value={activeCafe.area} onChange={v=>updateCafe({area:v})}/><Field label="Opening hours" value={activeCafe.hours} onChange={v=>updateCafe({hours:v})}/><Field label="Mood / atmosphere" value={activeCafe.mood} onChange={v=>updateCafe({mood:v})}/></div>
          <label className="field-label">Short description</label><textarea value={activeCafe.desc} onChange={e=>updateCafe({desc:e.target.value})}/>
          <div className="panel-divider"/><h4>Reported crowd & seating</h4><p className="muted small">These are staff-submitted estimates, not automatic live occupancy.</p>
          <div className="form-grid"><div><label className="field-label">Crowd level</label><select value={activeCafe.crowd} onChange={e=>updateCafe({crowd:e.target.value})}>{["Quiet","Moderate","Busy","Very Busy"].map(x=><option>{x}</option>)}</select></div><Field label="Vacant seats (estimate)" value={String(activeCafe.seats)} onChange={v=>updateCafe({seats:Math.max(0,Number(v)||0)})} type="number"/></div>
          <div className="panel-divider"/><h4>Menu highlights</h4>{activeCafe.menu.map((m,i)=><div className="menu-edit" key={i}><input value={m[0]} onChange={e=>updateCafe({menu:activeCafe.menu.map((x,j)=>j===i?[e.target.value,x[1]]:x)})}/><input value={m[1]} onChange={e=>updateCafe({menu:activeCafe.menu.map((x,j)=>j===i?[x[0],e.target.value]:x)})}/></div>)}<button className="text-button" onClick={()=>updateCafe({menu:[...activeCafe.menu,["New menu item","₹0"]]})}><Plus size={15}/> Add menu item</button>
          <div className="panel-divider"/><h4>Photo gallery</h4><label className="upload-zone"><Upload/><b>Choose a café photo</b><span>JPG or PNG · preview only in demo</span><input type="file" accept="image/*" onChange={uploadPhoto}/></label>{selectedPhoto&&<img className="photo-preview" src={selectedPhoto} alt="Selected upload preview"/>}
        </div>
        <div className="panel"><div className="panel-head"><div><h3>Recent activity</h3><p>Important changes are recorded in this demo log.</p></div></div>{activity.slice(0,6).map((a,i)=><div className="activity-line" key={i}><span/><p>{a}</p></div>)}</div>
      </section></div>
    </main>}

    {page === "admin" && <main className="content page-content"><div className="eyebrow">PLATFORM OPERATIONS</div><h2>Admin review workspace</h2><p className="muted">Sample admin view. Real admin privileges must be assigned server-side.</p><div className="admin-grid"><div className="panel"><h3>Create manager access</h3><p className="muted small">In production, create an invitation or password-reset link using a trusted server function. Never email or store a permanent plaintext password.</p><label className="field-label">Manager email / username</label><input value={managerEmail} onChange={e=>setManagerEmail(e.target.value)} placeholder="manager@cafe.com"/><label className="field-label">Temporary password (demo only)</label><div className="password-wrap"><input type={showPassword?"text":"password"} value={managerTempPassword} onChange={e=>setManagerTempPassword(e.target.value)} placeholder="Temporary password"/><button onClick={()=>setShowPassword(v=>!v)} aria-label="Show or hide password">{showPassword?<EyeOff/>:<Eye/>}</button></div><button className="button button-dark full" onClick={()=>{if(!managerEmail||!managerTempPassword)return flash("Enter manager email and temporary password.");flash("Demo manager invite recorded. No account was created.");setActivity(a=>[`Manager invitation prepared for ${managerEmail} (demo)`,...a]);setManagerEmail("");setManagerTempPassword("");}}>Prepare manager invite</button></div><div className="panel"><h3>Moderation queue</h3>{["Ownership claim · The Fern & Filter","Photo review · Common Grounds","Profile update · Little Window Café"].map((x,i)=><div className="queue-row" key={x}><div><b>{x}</b><small>Awaiting admin review · Demo</small></div><button className="button button-outline button-small" onClick={()=>flash("Demo review marked approved. No real claim was changed.")}>Review</button></div>)}</div></div></main>}

    <footer className="footer"><div className="brand footer-brand"><span className="brand-mark"><Coffee size={19}/></span><span>CaféScape<small>FIND YOUR CORNER</small></span></div><span>Made for good coffee and better connections.</span><span>© 2026 CaféScape · Demo build</span></footer>

    {notice && <div className="toast"><CheckCircle2 size={17}/>{notice}</div>}
    {modal && <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)setModal("")}}><div className="modal">
      <button className="modal-close" onClick={()=>setModal("")}><X/></button>
      {modal==="login" && <><div className="modal-icon"><Coffee/></div><div className="eyebrow">WELCOME TO CAFÉSCAPE</div><h2>{otpSent?"Verify your email":"Sign in or create an account"}</h2><p className="muted">Customers use email verification to access bookings, favourites and reviews.</p>{!otpSent?<form onSubmit={sendOtp}><label className="field-label">Email address</label><input type="email" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com"/><button className="button button-dark full">Send verification code</button></form>:<form onSubmit={verifyOtp}><label className="field-label">Email verification code</label><input required value={otp} onChange={e=>setOtp(e.target.value)} placeholder="Enter 6-digit code"/><button className="button button-dark full">Verify & continue</button><button type="button" className="text-button" onClick={()=>setOtpSent(false)}>Change email</button></form>}{isDemo&&<small className="fine-print">Demo OTP: 123456. This is not an actual email verification.</small>}</>}
      {modal==="booking" && <><div className="eyebrow">SEAT RESERVATION</div><h2>Reserve at {activeCafe.name}</h2><p className="muted">Choose a time slot. The café sets the price and confirms availability.</p><form onSubmit={reserveSeat}><label className="field-label">Date</label><input type="date" required value={booking.date} onChange={e=>setBooking({...booking,date:e.target.value})}/><label className="field-label">Arrival time</label><input type="time" required value={booking.time} onChange={e=>setBooking({...booking,time:e.target.value})}/><div className="form-grid"><div><label className="field-label">Duration</label><select value={booking.duration} onChange={e=>setBooking({...booking,duration:e.target.value})}>{["30 minutes","1 hour","90 minutes","2 hours","3 hours"].map(x=><option>{x}</option>)}</select></div><div><label className="field-label">Seats</label><select value={booking.seats} onChange={e=>setBooking({...booking,seats:Number(e.target.value)})}>{[1,2,3,4,5,6].map(x=><option value={x}>{x}</option>)}</select></div></div><div className="payment-note"><ShieldCheck/><span><b>Payment integration required</b><small>Final price and direct café payout are not enabled in this demo.</small></span></div><button className="button button-dark full">Continue (demo booking)</button></form></>}
      {modal==="review" && <><div className="eyebrow">COMMUNITY VOICE</div><h2>Share your experience</h2><p className="muted">Reviews are independent of café promotional content.</p><form onSubmit={addReview}><label className="field-label">Your rating</label><select value={reviewStars} onChange={e=>setReviewStars(Number(e.target.value))}>{[5,4,3,2,1].map(x=><option value={x}>{x} stars</option>)}</select><label className="field-label">Your review</label><textarea required value={review} onChange={e=>setReview(e.target.value)} placeholder="What made this café memorable?"/><label className="upload-zone compact"><Camera/><b>Add review photo</b><span>Photo upload is not connected in demo</span><input type="file" accept="image/*"/></label><button className="button button-dark full">Submit review</button></form></>}
    </div></div>}
  </div>;
}

function CafeCard({cafe,saved,onSave,onOpen}) {
  return <article className="cafe-card"><div className="card-image" onClick={onOpen}><img src={cafe.image} alt={cafe.name}/><span className="price-tag">{cafe.price}</span><button className={`save-button ${saved?"saved":""}`} onClick={e=>{e.stopPropagation();onSave()}} aria-label="Save café"><Heart size={18} fill={saved?"currentColor":"none"}/></button></div><div className="card-body"><div className="card-meta"><span><MapPin size={13}/>{cafe.area}</span><span className="rating"><Star size={14} fill="currentColor"/>{cafe.rating}</span></div><h3 onClick={onOpen}>{cafe.name}</h3><p>{cafe.mood}</p><div className="card-bottom"><span className="crowd-label"><i className={`crowd-dot ${cafe.crowd.toLowerCase().replace(" ","-")}`}/>{cafe.crowd} <small>· {cafe.seats} seats est.</small></span><button onClick={onOpen}>Explore <ChevronRight size={15}/></button></div></div></article>;
}
function Field({label,value,onChange,type="text"}) { return <div><label className="field-label">{label}</label><input type={type} value={value} onChange={e=>onChange(e.target.value)}/></div>; }
function Stat({label,value,icon}) { return <div className="stat-card"><span>{icon}</span><div><b>{value}</b><small>{label}</small></div></div>; }

export default App;