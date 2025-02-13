import {ChangeDetectionStrategy, ChangeDetectorRef, Component, Inject, OnDestroy, OnInit} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialog, MatDialogRef} from '@angular/material/dialog';
import {Project, ProjectCopy} from '../../project.model';
import {FormGroup} from '@angular/forms';
import {FormlyFieldConfig, FormlyFormOptions} from '@ngx-formly/core';
import {ProjectService} from '../../project.service';
import {DEFAULT_PROJECT} from '../../project.const';
import {JiraCfg} from '../../../issue/jira/jira';
import {BASIC_PROJECT_CONFIG_FORM_CONFIG, PROJECT_THEME_CONFIG_FORM_CONFIG} from '../../project-form-cfg.const';
import {IssueIntegrationCfgs} from '../../../issue/issue';
import {DialogJiraInitialSetupComponent} from '../../../issue/jira/dialog-jira-initial-setup/dialog-jira-initial-setup.component';
import {SS_PROJECT_TMP} from '../../../../core/persistence/ls-keys.const';
import {Subscription} from 'rxjs';
import {loadFromSessionStorage, saveToSessionStorage} from '../../../../core/persistence/local-storage';
import {GithubCfg} from '../../../issue/github/github';
import {DialogGithubInitialSetupComponent} from '../../../issue/github/dialog-github-initial-setup/dialog-github-initial-setup.component';
import {GITHUB_TYPE} from '../../../issue/issue.const';
import {T} from '../../../../t.const';

@Component({
  selector: 'dialog-create-project',
  templateUrl: './dialog-create-project.component.html',
  styleUrls: ['./dialog-create-project.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DialogCreateProjectComponent implements OnInit, OnDestroy {
  T = T;
  projectData: ProjectCopy | Partial<ProjectCopy> = DEFAULT_PROJECT;
  jiraCfg: JiraCfg;
  githubCfg: GithubCfg;

  formBasic = new FormGroup({});
  formTheme = new FormGroup({});
  formOptionsBasic: FormlyFormOptions = {
    formState: {
      awesomeIsForced: false,
    },
  };
  formOptionsTheme: FormlyFormOptions = {
    formState: {
      awesomeIsForced: false,
    },
  };

  basicSettingsFormCfg: FormlyFieldConfig[] = [];
  themeFormCfg: FormlyFieldConfig[] = [];

  private _subs = new Subscription();
  private _isSaveTmpProject: boolean;

  constructor(
    @Inject(MAT_DIALOG_DATA) private _project: Project,
    private _projectService: ProjectService,
    private _matDialog: MatDialog,
    private _matDialogRef: MatDialogRef<DialogCreateProjectComponent>,
    private _cd: ChangeDetectorRef,
  ) {
    // somehow they are only unproblematic if assigned here,
    this.basicSettingsFormCfg = BASIC_PROJECT_CONFIG_FORM_CONFIG.items;
    this.themeFormCfg = PROJECT_THEME_CONFIG_FORM_CONFIG.items;
  }

  ngOnInit() {
    if (this._project) {
      this.projectData = {...this._project};

    } else {
      if (loadFromSessionStorage(SS_PROJECT_TMP)) {
        this.projectData = {
          ...DEFAULT_PROJECT,
          ...loadFromSessionStorage(SS_PROJECT_TMP),
        };
      }
      this._isSaveTmpProject = true;

      // save tmp data if adding a new project
      // NOTE won't be properly executed if added to _subs
      this._matDialogRef.afterClosed().subscribe(() => {
        const issueIntegrationCfgs: IssueIntegrationCfgs = {
          ...this.projectData.issueIntegrationCfgs,
          JIRA: this.jiraCfg,
          GITHUB: this.githubCfg,
        };
        const projectDataToSave: Project | Partial<Project> = {
          ...this.projectData,
          issueIntegrationCfgs,
        };
        if (this._isSaveTmpProject) {
          saveToSessionStorage(SS_PROJECT_TMP, projectDataToSave);
        }
      });
    }

    if (this.projectData.issueIntegrationCfgs) {
      if (this.projectData.issueIntegrationCfgs.JIRA) {
        this.jiraCfg = this.projectData.issueIntegrationCfgs.JIRA;
      }
      if (this.projectData.issueIntegrationCfgs.GITHUB) {
        this.githubCfg = this.projectData.issueIntegrationCfgs.GITHUB;
      }
    }
  }

  ngOnDestroy(): void {
    this._subs.unsubscribe();
  }

  submit() {
    const issueIntegrationCfgs: IssueIntegrationCfgs = {
      ...this.projectData.issueIntegrationCfgs,
      JIRA: this.jiraCfg,
      GITHUB: this.githubCfg,
    };

    const projectDataToSave: Project | Partial<Project> = {
      ...this.projectData,
      issueIntegrationCfgs,
    };

    if (projectDataToSave.id) {
      this._projectService.update(projectDataToSave.id, projectDataToSave);
    } else {
      this._projectService.add(projectDataToSave);
    }
    this._isSaveTmpProject = false;
    saveToSessionStorage(SS_PROJECT_TMP, null);

    this._matDialogRef.close();
  }

  cancelEdit() {
    this._matDialogRef.close();
  }

  openJiraCfg() {
    this._subs.add(this._matDialog.open(DialogJiraInitialSetupComponent, {
      restoreFocus: true,
      data: {
        jiraCfg: this.jiraCfg,
      }
    }).afterClosed().subscribe((jiraCfg: JiraCfg) => {

      if (jiraCfg) {
        this._saveJiraCfg(jiraCfg);
      }
    }));
  }

  openGithubCfg() {
    this._subs.add(this._matDialog.open(DialogGithubInitialSetupComponent, {
      restoreFocus: true,
      data: {
        githubCfg: this.githubCfg,
      }
    }).afterClosed().subscribe((gitCfg: GithubCfg) => {

      if (gitCfg) {
        this._saveGithubCfg(gitCfg);
      }
    }));
  }

  private _saveJiraCfg(jiraCfg: JiraCfg) {
    this.jiraCfg = jiraCfg;
    this._cd.markForCheck();

    // if we're editing save right away
    if (this.projectData.id) {
      this._projectService.updateIssueProviderConfig(this.projectData.id, 'JIRA', this.jiraCfg);
    }
  }

  private _saveGithubCfg(githubCfg: GithubCfg) {
    this.githubCfg = githubCfg;
    this._cd.markForCheck();

    // if we're editing save right away
    if (this.projectData.id) {
      this._projectService.updateIssueProviderConfig(this.projectData.id, GITHUB_TYPE, this.githubCfg);
    }
  }
}
