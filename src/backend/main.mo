import Map "mo:core/Map";
import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import Array "mo:core/Array";
import Iter "mo:core/Iter";
import Text "mo:core/Text";
import Principal "mo:core/Principal";
import Order "mo:core/Order";


import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";


actor {
  // Initialize the access control system
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  type UserProfile = {
    principal : Principal;
    pvName : Text;
    registeredAt : Time.Time;
    waehrung : Text;
    co2Faktor : Float;
  };

  module PVSession {
    public type ID = Text;

    public type PVSession = {
      id : Text;
      name : Text;
      timestamp : Time.Time;
      data : Text;
      owner : Principal;
    };

    public module ID {
      public func toText(id : ID) : Text {
        id;
      };

      public func compare(id1 : ID, id2 : ID) : Order.Order {
        Text.compare(id1, id2);
      };
    };
  };

  module WattpilotSession {
    public type ID = Text;

    public type WattpilotSession = {
      id : Text;
      name : Text;
      timestamp : Time.Time;
      data : Text;
      owner : Principal;
    };

    public module ID {
      public func toText(id : ID) : Text {
        id;
      };

      public func compare(id1 : ID, id2 : ID) : Order.Order {
        Text.compare(id1, id2);
      };
    };
  };

  module PremiumSession {
    public type ID = Text;

    public type PremiumSession = {
      id : Text;
      name : Text;
      timestamp : Time.Time;
      data : Text;
      owner : Principal;
    };

    public module ID {
      public func toText(id : ID) : Text {
        id;
      };

      public func compare(id1 : ID, id2 : ID) : Order.Order {
        Text.compare(id1, id2);
      };
    };
  };

  module AnalyticsResult {
    public type ID = Text;

    public type AnalyticsResult = {
      id : Text;
      timestamp : Time.Time;
      autarkyRate : Float;
      selfConsumptionRate : Float;
      pvShareOfEVCharging : Float;
      totalPVGeneration : Float;
      totalGridDraw : Float;
      totalGridFeedIn : Float;
      totalEVCharging : Float;
      owner : Principal;
    };

    public module ID {
      public func toText(id : ID) : Text {
        id;
      };

      public func compare(id1 : ID, id2 : ID) : Order.Order {
        Text.compare(id1, id2);
      };
    };
  };

  type TarifStufe = {
    id : Text;
    preis : Float;
    farbe : Text;
  };

  type TarifPeriode = {
    id : Text;
    von : Text;
    bis : Text;
    stufen : [TarifStufe];
    bezugStufen : [TarifStufe];
    einspeiseStufen : [TarifStufe];
    zuordnungBezug : [[Text]];
    zuordnungEinspeisung : [[Text]];
    owner : Principal;
  };

  stable var users = Map.empty<Principal, UserProfile>();
  stable var pvSessions = Map.empty<PVSession.ID, PVSession.PVSession>();
  stable var wattpilotSessions = Map.empty<WattpilotSession.ID, WattpilotSession.WattpilotSession>();
  stable var premiumSessions = Map.empty<PremiumSession.ID, PremiumSession.PremiumSession>();
  stable var analyticsResults = Map.empty<AnalyticsResult.ID, AnalyticsResult.AnalyticsResult>();
  stable var tarifPerioden = Map.empty<Text, TarifPeriode>();

  // Required profile management functions
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    users.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    users.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    users.add(caller, profile);
  };

  // New function to update waehrung
  public shared ({ caller }) func updateWaehrung(waehrung : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update waehrung");
    };
    let profile = switch (users.get(caller)) {
      case (null) { Runtime.trap("User not registered") };
      case (?p) { p };
    };
    users.add(caller, { profile with waehrung });
  };

  // New function to update co2Faktor
  public shared ({ caller }) func updateCo2Faktor(co2Faktor : Float) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update co2Faktor");
    };
    let profile = switch (users.get(caller)) {
      case (null) { Runtime.trap("User not registered") };
      case (?p) { p };
    };
    users.add(caller, { profile with co2Faktor });
  };

  // User registration and profile access
  public shared ({ caller }) func registerUser(pvName : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can register");
    };
    if (users.containsKey(caller)) {
      Runtime.trap("User already registered");
    };
    let profile : UserProfile = {
      principal = caller;
      pvName;
      registeredAt = Time.now();
      waehrung = "CHF";
      co2Faktor = 0.128;
    };
    users.add(caller, profile);
  };

  public query ({ caller }) func getMyProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can view their profile");
    };
    users.get(caller);
  };

  public query ({ caller }) func isRegistered() : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can check registration");
    };
    users.containsKey(caller);
  };

  func checkUserRegistered(caller : Principal) {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can perform this action");
    };
    if (not users.containsKey(caller)) {
      Runtime.trap("User not registered");
    };
  };

  // PV Session management
  public shared ({ caller }) func addPVSession(id : Text, name : Text, data : Text) : async () {
    checkUserRegistered(caller);
    let session : PVSession.PVSession = {
      id;
      name;
      timestamp = Time.now();
      data;
      owner = caller;
    };
    pvSessions.add(id, session);
  };

  public query ({ caller }) func getPVSessions() : async [PVSession.PVSession] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can view sessions");
    };
    pvSessions.values().filter(
      func(session) {
        session.owner == caller;
      }
    ).toArray();
  };

  // Wattpilot Session management
  public shared ({ caller }) func addWattpilotSession(id : Text, name : Text, data : Text) : async () {
    checkUserRegistered(caller);
    let session : WattpilotSession.WattpilotSession = {
      id;
      name;
      timestamp = Time.now();
      data;
      owner = caller;
    };
    wattpilotSessions.add(id, session);
  };

  public query ({ caller }) func getWattpilotSessions() : async [WattpilotSession.WattpilotSession] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can view sessions");
    };
    wattpilotSessions.values().filter(
      func(session) {
        session.owner == caller;
      }
    ).toArray();
  };

  // Premium Session management
  public shared ({ caller }) func addPremiumSession(id : Text, name : Text, data : Text) : async () {
    checkUserRegistered(caller);
    let session : PremiumSession.PremiumSession = {
      id;
      name;
      timestamp = Time.now();
      data;
      owner = caller;
    };
    premiumSessions.add(id, session);
  };

  // Append additional data chunk to an existing premium session
  public shared ({ caller }) func appendPremiumSessionData(id : Text, chunk : Text) : async () {
    checkUserRegistered(caller);
    switch (premiumSessions.get(id)) {
      case (null) { Runtime.trap("Session not found") };
      case (?session) {
        if (session.owner != caller) {
          Runtime.trap("Access denied: You can only modify your own sessions");
        };
        let updated : PremiumSession.PremiumSession = {
          session with data = session.data # chunk;
        };
        premiumSessions.add(id, updated);
      };
    };
  };

  public query ({ caller }) func getPremiumSessions() : async [PremiumSession.PremiumSession] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can view sessions");
    };
    premiumSessions.values().filter(
      func(session) {
        session.owner == caller;
      }
    ).toArray();
  };

  // Generic session access
  public query ({ caller }) func getSession(id : Text, sessionType : Text) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can view sessions");
    };
    switch (sessionType) {
      case ("pv") {
        switch (pvSessions.get(id)) {
          case (null) { Runtime.trap("Session not found") };
          case (?session) {
            if (session.owner != caller) {
              Runtime.trap("Access denied: You can only view your own sessions");
            };
            session.data;
          };
        };
      };
      case ("wattpilot") {
        switch (wattpilotSessions.get(id)) {
          case (null) { Runtime.trap("Session not found") };
          case (?session) {
            if (session.owner != caller) {
              Runtime.trap("Access denied: You can only view your own sessions");
            };
            session.data;
          };
        };
      };
      case ("premium") {
        switch (premiumSessions.get(id)) {
          case (null) { Runtime.trap("Session not found") };
          case (?session) {
            if (session.owner != caller) {
              Runtime.trap("Access denied: You can only view your own sessions");
            };
            session.data;
          };
        };
      };
      case (_) { Runtime.trap("Invalid session type") };
    };
  };

  public shared ({ caller }) func deleteSession(id : Text, sessionType : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can delete sessions");
    };
    switch (sessionType) {
      case ("pv") {
        switch (pvSessions.get(id)) {
          case (null) { Runtime.trap("Session not found") };
          case (?session) {
            if (session.owner != caller) {
              Runtime.trap("Access denied: You can only delete your own sessions");
            };
            pvSessions.remove(id);
          };
        };
      };
      case ("wattpilot") {
        switch (wattpilotSessions.get(id)) {
          case (null) { Runtime.trap("Session not found") };
          case (?session) {
            if (session.owner != caller) {
              Runtime.trap("Access denied: You can only delete your own sessions");
            };
            wattpilotSessions.remove(id);
          };
        };
      };
      case ("premium") {
        switch (premiumSessions.get(id)) {
          case (null) { Runtime.trap("Session not found") };
          case (?session) {
            if (session.owner != caller) {
              Runtime.trap("Access denied: You can only delete your own sessions");
            };
            premiumSessions.remove(id);
          };
        };
      };
      case (_) { Runtime.trap("Invalid session type") };
    };
  };

  // Analytics results management
  public shared ({ caller }) func saveAnalyticsResult(id : Text, result : AnalyticsResult.AnalyticsResult) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can save analytics results");
    };
    let resultWithOwner = {
      result with owner = caller;
    };
    analyticsResults.add(id, resultWithOwner);
  };

  public query ({ caller }) func getLatestAnalyticsResult() : async ?AnalyticsResult.AnalyticsResult {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can view analytics results");
    };
    let results = analyticsResults.values().filter(
      func(result) {
        result.owner == caller;
      }
    ).toArray();
    if (results.size() == 0) {
      null;
    } else {
      ?results.reverse()[0];
    };
  };

  // Tariff Period Management
  public shared ({ caller }) func addTarifPeriode(periode : TarifPeriode) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can add tariff periods");
    };
    let newPeriode : TarifPeriode = {
      periode with owner = caller;
    };
    tarifPerioden.add(periode.id, newPeriode);
  };

  public shared ({ caller }) func updateTarifPeriode(periode : TarifPeriode) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can update tariff periods");
    };
    switch (tarifPerioden.get(periode.id)) {
      case (null) { Runtime.trap("Tariff period not found") };
      case (?existing) {
        if (existing.owner != caller) {
          Runtime.trap("Access denied: Only the owner can update this tariff period");
        };
        let updatedPeriode : TarifPeriode = {
          periode with owner = existing.owner;
        };
        tarifPerioden.add(periode.id, updatedPeriode);
      };
    };
  };

  public shared ({ caller }) func deleteTarifPeriode(id : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can delete tariff periods");
    };
    switch (tarifPerioden.get(id)) {
      case (null) { Runtime.trap("Tariff period not found") };
      case (?existing) {
        if (existing.owner != caller) {
          Runtime.trap("Access denied: Only the owner can delete this tariff period");
        };
        tarifPerioden.remove(id);
      };
    };
  };

  public query ({ caller }) func getTarifPerioden() : async [TarifPeriode] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only authenticated users can view tariff periods");
    };
    tarifPerioden.values().filter(
      func(periode) {
        periode.owner == caller;
      }
    ).toArray();
  };

  // Sample data - public access (no authentication required)
  public query func getPVSampleData() : async Text {
    "Timestamp,Generated Power (kWh),Consumed Power (kWh)\n2023-01-01 08:00,1.2,0.5\n2023-01-01 09:00,2.5,1.0";
  };

  public query func getWattpilotSampleData() : async Text {
    "Timestamp,Charged Power (kWh),Phase\n2023-01-01 10:00,2.0,L1\n2023-01-01 11:00,3.1,L3";
  };

  // Admin-only function
  public query ({ caller }) func getAllProfiles() : async [UserProfile] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can view all profiles");
    };
    users.values().toArray();
  };
};
