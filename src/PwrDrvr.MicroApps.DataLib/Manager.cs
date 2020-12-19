﻿using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.DataModel;
using PwrDrvr.MicroApps.DataLib.Models;

namespace PwrDrvr.MicroApps.DataLib {
  public interface IVersionsAndRules {
    List<Models.Version> Versions { get; set; }
    Rules Rules { get; set; }
  }

  public class VersionsAndRules : IVersionsAndRules {
    public List<Models.Version> Versions { get; set; }
    public Rules Rules { get; set; }
  }

  public class Manager {
    private static readonly AmazonDynamoDBClient _client = new AmazonDynamoDBClient();
    private static readonly DynamoDBContext _context = new DynamoDBContext(_client);

    static public void Init() {
      return;
    }

    static public DynamoDBContext Context {
      get {
        return _context;
      }
    }

    static public async Task<List<Models.Application>> GetAllApps() {
      var search = _context.QueryAsync<Models.Application>("applications");
      return await search.GetRemainingAsync();
    }

    static public async Task CreateApp(Application app) {
      // Try to create the record, fail if it exists
      // TODO: Confirm record is new
      await app.SaveAsync();
    }

    static public async Task CreateVersion(Models.Version version) {
      // TODO: Try to create the version, fail if it exists or app does not exist
      //       Use `ConditionExpression like attribute_not_exists(foo) AND attribute_not_exists(bar)`
      await _context.SaveAsync(version);
    }

    static public async Task<Models.Version> GetAppVersion(string appName, string version) {
      // Get single version of an app
      return await Models.Version.GetVersionAsync(appName, version);
    }

    static public async Task<List<Models.Version>> GetAppVersions(string appName) {
      // Get all versions and rules for an app
      // Note: versions are moved out of this key as they become inactive
      // There should be less than, say, 100 versions per app
      return await Models.Version.GetVersionsAsync(appName);
    }

    static public async Task<IVersionsAndRules> GetVersionsAndRules(string appName) {
      // Get all versions and rules for an app
      // Note: versions are moved out of this key as they become inactive
      // There should be less than, say, 100 versions per app

      var versionTask = Models.Version.GetVersionsAsync(appName);
      var rulesTask = Rules.GetRulesAsync(appName);

      await Task.WhenAll(versionTask, rulesTask);

      return new VersionsAndRules() {
        Versions = await versionTask,
        Rules = await rulesTask
      };
    }

    static public async Task UpdateRules(Rules rules) {
      // Create or overwrite rules for an app
      await _context.SaveAsync(rules);
    }

    static public async Task<Rules> GetRules(string appName) {
      // Get Rules for an app
      // Used by Router to evaluate rules when app is launched
      // Also used by Release app to retrieve rules for editing

      return await Rules.GetRulesAsync(appName);
    }
  }
}